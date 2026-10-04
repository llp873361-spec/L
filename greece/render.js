// 逐帧渲染：playwright 打开 index.html?render=1，一帧一帧调 draw(t) 取 png，最后 ffmpeg 合成无声 mp4
const fs = require('fs');
const path = require('path');
const ul = require('url');
const cp = require('child_process');

const dir = __dirname;
const out = path.join(dir, 'out');
const fdir = path.join(out, 'frames');
const cdir = path.join(out, 'check');
const fps = 30;
const keep = process.argv.includes('--keep');

// --at 2.2,3.8：另外导出这几个时刻（全片时间，秒）的检查图
let at = [];
const ai = process.argv.indexOf('--at');
if (ai >= 0) {
	const raw = process.argv[ai + 1];
	if (!raw || raw.startsWith('--')) {
		console.error('--at 后面要跟时间，比如 --at 2.2,3.8');
		process.exit(1);
	}
	at = raw.split(',').map(s => {
		const x = Number(s);
		if (s.trim() === '' || !Number.isFinite(x) || x < 0) {
			console.error('--at 里有看不懂的时间：「' + s + '」');
			process.exit(1);
		}
		return x;
	});
}

// 先看 ffmpeg 在不在
function has(cmd) {
	const r = cp.spawnSync(cmd, ['-version'], { stdio: 'ignore' });
	return !r.error && r.status === 0;
}
if (!has('ffmpeg') || !has('ffprobe')) {
	console.error('没找到 ffmpeg（或者 ffprobe），装好再跑：');
	console.error('  macOS:   brew install ffmpeg');
	console.error('  Ubuntu:  sudo apt install ffmpeg');
	console.error('  Windows: winget install ffmpeg   装完重开终端，确认 ffmpeg -version 能跑');
	process.exit(1);
}

// 字体缺了直接停，不让它悄悄用系统字体
for (const f of ['fonts/NotoSerifSC-Regular.otf', 'fonts/NotoSerif-Regular.ttf']) {
	if (!fs.existsSync(path.join(dir, f))) {
		console.error('缺字体文件：' + f + '。不会退回系统字体，先把字体放进 fonts/ 再跑');
		process.exit(1);
	}
}

let pw;
try {
	pw = require('playwright');
} catch (e) {
	console.error('没装 playwright，先跑 npm install，再跑 npx playwright install chromium');
	process.exit(1);
}

function run(cmd, args) {
	const r = cp.spawnSync(cmd, args, { cwd: dir, stdio: 'inherit' });
	if (r.error || r.status !== 0) throw new Error(cmd + ' 跑失败了，退出码 ' + r.status);
}

(async () => {
	const brw = await pw.chromium.launch();
	try {
		const pg = await brw.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
		pg.on('pageerror', e => console.error('页面报错：', e.message));
		await pg.goto(ul.pathToFileURL(path.join(dir, 'index.html')).href + '?render=1');
		try {
			await pg.evaluate(() => window.ready);
		} catch (e) {
			throw new Error('页面没准备好：' + e.message.replace(/^.*?Error: /s, ''));
		}
		const tot = await pg.evaluate(() => window.total);
		const segs = await pg.evaluate(() => window.segs);
		// 帧号从 0 到 ceil(tot*30)-1。减一个很小的数，防止 7.1*30 这种算出 213.00000000000003 多渲一帧
		const n = Math.ceil(tot * fps - 1e-6);
		console.log('总时长 ' + tot + 's，共 ' + n + ' 帧');
		for (const sg of segs) console.log('  ' + sg.name.padEnd(6) + ' 开始 ' + sg.start.toFixed(1) + 's  时长 ' + sg.dur.toFixed(1) + 's');

		const shot = async t => {
			const url = await pg.evaluate(x => {
				window.draw(x);
				return document.getElementById('cv').toDataURL('image/png');
			}, t);
			return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
		};

		// 逐帧截图
		fs.rmSync(fdir, { recursive: true, force: true });
		fs.mkdirSync(fdir, { recursive: true });
		for (let i = 0; i < n; i++) {
			fs.writeFileSync(path.join(fdir, 'f' + String(i).padStart(5, '0') + '.png'), await shot(i / fps));
			process.stdout.write('\r渲染中 ' + ((i + 1) / n * 100).toFixed(1) + '%  (' + (i + 1) + '/' + n + ')');
		}
		process.stdout.write('\n');

		// 合成
		run('ffmpeg', ['-y', '-framerate', '30', '-i', 'out/frames/f%05d.png', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'out/video.mp4']);
		if (keep) console.log('帧图留在 out/frames');
		else fs.rmSync(fdir, { recursive: true, force: true });

		// 封面
		const cov = await pg.evaluate(() => {
			window.drawCover();
			return document.getElementById('cv').toDataURL('image/png');
		});
		fs.writeFileSync(path.join(out, 'cover.png'), Buffer.from(cov.slice(cov.indexOf(',') + 1), 'base64'));
		console.log('封面 out/cover.png');

		// 检查图：每段在 开始 + 时长 - 0.7s 那一帧
		fs.rmSync(cdir, { recursive: true, force: true });
		fs.mkdirSync(cdir, { recursive: true });
		console.log('检查图 out/check：');
		for (const sg of segs) {
			const f = Math.round((sg.start + sg.dur - 0.7) * fps);
			fs.writeFileSync(path.join(cdir, sg.name + '.png'), await shot(f / fps));
			console.log('  ' + (sg.name + '.png').padEnd(11) + ' 第 ' + f + ' 帧  t=' + (f / fps).toFixed(3) + 's（条内 ' + (f / fps - sg.start).toFixed(3) + 's）');
		}
		for (const x of at) {
			const f = Math.round(x * fps);
			if (f >= n) throw new Error('--at ' + x + ' 超出总时长 ' + tot + 's');
			const nm = 't' + (f / fps).toFixed(2) + '.png';
			fs.writeFileSync(path.join(cdir, nm), await shot(f / fps));
			console.log('  ' + nm.padEnd(11) + ' 第 ' + f + ' 帧  t=' + (f / fps).toFixed(3) + 's');
		}
	} finally {
		await brw.close();
	}

	// 最后看一眼成片参数
	const r = cp.spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate:format=duration', '-of', 'json', 'out/video.mp4'], { cwd: dir, encoding: 'utf8' });
	if (r.error || r.status !== 0) throw new Error('ffprobe 读不了 out/video.mp4');
	const j = JSON.parse(r.stdout), st = j.streams[0];
	const [a, b] = st.r_frame_rate.split('/').map(Number);
	console.log('成片 out/video.mp4：分辨率 ' + st.width + 'x' + st.height + '，帧率 ' + (a / b) + 'fps，时长 ' + Number(j.format.duration).toFixed(3) + 's');
})().catch(e => {
	console.error('\n出错了：' + (e.message || e));
	process.exit(1);
});
