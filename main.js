import * as THREE from 'three'
import { rgb, glsl, nois, v3 } from './palette.js'
import * as sky from './sky.js'
import * as ocean from './ocean.js'
import * as city from './worlds/city.js'
import * as flower from './worlds/flower.js'

const mob = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
const rm = matchMedia('(prefers-reduced-motion: reduce)')
const qs = new URLSearchParams(location.search)
const key = 'fenxing-visit'
const tip = document.getElementById('tip')
const cnt = document.getElementById('cnt')
const fpe = document.getElementById('fps')
const bkb = document.getElementById('back')
const wld = { city, flower }

let rd, W = 1, H = 1
let pr = Math.min(devicePixelRatio || 1, mob ? 1.5 : 2)
let rtA, rtB, rtC, bl, quad, ocam
let mLens, mZoom, mBri, mBlur, mFin
let lay = null, lnm = '', tr = null, run = true, last = 0, clk = 0
let ptr = false, pd = null, pin = 0, fail = null, bk = null
let ft = 1 / 60, fchk = 0, fsw = 0
const fm = { n: 0, s: 0, avg: 0 }
const pts = new Map()
const inp = { mx: 0, my: 0, dx: 0, dy: 0, wh: 0, push: 0, fly: false, hold: false, rm: false }
const ov = { zoom: 0, zx: 0, zy: 0, blk: 0, r: -1, w: 0, rim: 0 }
const tmp = new THREE.Vector3()
const v2 = new THREE.Vector2()
const vis = rdv()

function rdv() {
	try {
		const a = JSON.parse(localStorage.getItem(key) || '[]')
		return Array.isArray(a) ? a.filter(k => k in ocean.names) : []
	} catch (e) {
		console.log('到访记录读不出来，先当作一个都没去过', e)
		return []
	}
}

function wrv() {
	try {
		localStorage.setItem(key, JSON.stringify(vis))
	} catch (e) {
		console.log('到访记录存不进去，这次只记在内存里', e)
	}
}

const ss = (a, b, x) => {
	const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
	return t * t * (3 - 2 * t)
}

const vq = `varying vec2 vu;
void main() {
	vu = uv;
	gl_Position = vec4(position.xy, 0., 1.);
}`

function sm(fs, un) {
	return new THREE.ShaderMaterial({ vertexShader: vq, fragmentShader: fs, uniforms: un, depthTest: false, depthWrite: false })
}

function tq(c) {
	const y = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
	return [y * 2, (c[2] - y) * 0.564, (c[0] - y) * 0.713]
}

function mats() {
	mLens = sm(`
uniform sampler2D src;
uniform vec2 res;
uniform vec4 lz;
uniform float dk;
varying vec2 vu;
void main() {
	vec2 p = gl_FragCoord.xy - lz.xy;
	float r = max(length(p), 0.5);
	float re = lz.z * lz.w;
	vec2 s = lz.xy + p * (1. - re * re / (r * r));
	vec3 c = texture2D(src, s / res).rgb;
	c *= 1. - dk * (1. - smoothstep(lz.z * 1.05, lz.z * 6., r));
	gl_FragColor = vec4(c, 1.);
}`, { src: { value: null }, res: { value: new THREE.Vector2() }, lz: { value: new THREE.Vector4() }, dk: { value: 0 } })

	mZoom = sm(`${nois}
uniform sampler2D src;
uniform vec2 ctr;
uniform float amt;
varying vec2 vu;
void main() {
	vec2 d = vu - ctr;
	float j = hs(vec3(gl_FragCoord.xy, 5.3));
	vec3 s = vec3(0.);
	float w = 0.;
	for (int i = 0; i < 18; i++) {
		float f = (float(i) + j) / 18.;
		float g = 1. - f * 0.55;
		s += texture2D(src, ctr + d * (1. - amt * f)).rgb * g;
		w += g;
	}
	gl_FragColor = vec4(s / w, 1.);
}`, { src: { value: null }, ctr: { value: new THREE.Vector2() }, amt: { value: 0 } })

	mBri = sm(`
#include <tonemapping_pars_fragment>
uniform sampler2D src;
uniform vec2 px;
varying vec2 vu;
void main() {
	vec3 c = texture2D(src, vu + px * vec2(-1., -1.)).rgb;
	c += texture2D(src, vu + px * vec2(1., -1.)).rgb;
	c += texture2D(src, vu + px * vec2(-1., 1.)).rgb;
	c += texture2D(src, vu + px * vec2(1., 1.)).rgb;
	c *= 0.25;
	vec3 d = ACESFilmicToneMapping(c);
	float y = dot(d, vec3(0.2126, 0.7152, 0.0722));
	gl_FragColor = vec4(min(c, vec3(40.)) * smoothstep(0.5, 0.72, y), 1.);
}`, { src: { value: null }, px: { value: new THREE.Vector2() } })

	mBlur = sm(`
uniform sampler2D src;
uniform vec2 dir;
varying vec2 vu;
void main() {
	vec3 c = texture2D(src, vu).rgb * 0.2270270270;
	c += texture2D(src, vu + dir * 1.3846153846).rgb * 0.3162162162;
	c += texture2D(src, vu - dir * 1.3846153846).rgb * 0.3162162162;
	c += texture2D(src, vu + dir * 3.2307692308).rgb * 0.0702702703;
	c += texture2D(src, vu - dir * 3.2307692308).rgb * 0.0702702703;
	gl_FragColor = vec4(c, 1.);
}`, { src: { value: null }, dir: { value: new THREE.Vector2() } })

	mFin = sm(`${glsl}
${nois}
const vec3 pq[8] = vec3[8](${rgb.map(c => v3(tq(c))).join(', ')});
const vec3 pc[8] = vec3[8](pk0, pk1, pk2, pk3, pk4, pk5, pk6, pk7);
uniform sampler2D src, b1, b2;
uniform vec2 res;
uniform float bk, blk, ovr, fla;
uniform vec4 foc, ovd;
uniform vec3 hol;
varying vec2 vu;
vec3 tq(vec3 c) {
	float y = dot(c, vec3(0.299, 0.587, 0.114));
	return vec3(y * 2., (c.b - y) * 0.564, (c.r - y) * 0.713);
}
vec3 prj(vec3 c, out vec3 pa, out vec3 pb) {
	vec3 q = tq(c);
	float bd = 1e9, bt = 0.;
	pa = pb = pc[0];
	for (int i = 0; i < 7; i++) {
		for (int j = i + 1; j < 8; j++) {
			vec3 a = pq[i];
			vec3 ab = pq[j] - a;
			float t = clamp(dot(q - a, ab) / dot(ab, ab), 0., 1.);
			vec3 e = q - a - ab * t;
			float d = dot(e, e);
			if (d < bd) {
				bd = d;
				bt = t;
				pa = pc[i];
				pb = pc[j];
			}
		}
	}
	return mix(pa, pb, bt);
}
void main() {
	float hm = hol.z > 0. ? smoothstep(hol.z * 0.75, hol.z * 1.02, length(gl_FragCoord.xy - hol.xy)) : 1.;
	float gw = 0.5 * (1. - exp(-lum(texture2D(b1, vu).rgb * 0.5 + texture2D(b2, vu).rgb * 0.55) * bk * hm * 1.6));
	vec3 c = toneMapping(texture2D(src, vu).rgb);
	c = linearToOutputTexel(vec4(c, 1.)).rgb;
	vec3 pa, pb;
	c = prj(clamp(c, 0., 1.), pa, pb);
	if (gw > 0.003) twk(c, pa, pb, true, gw);
	if (foc.w > 0.) {
		float d = length(gl_FragCoord.xy - foc.xy);
		twk(c, pa, pb, false, foc.w * smoothstep(foc.z * 1.02, foc.z * 1.7, d) * (1. - smoothstep(foc.z * 2.6, foc.z * 7., d)));
	}
	if (ovd.z >= 0.) {
		float d = length(gl_FragCoord.xy - ovd.xy);
		float e = max(ovd.z * 0.06, res.y * 0.004);
		twk(c, pa, pb, true, ovd.w);
		twk(c, pa, pb, false, smoothstep(ovd.z - e, ovd.z + e, d));
		twk(c, pa, pb, true, exp(-pow((d - ovd.z) / (e * 2.5 + res.y * 0.01), 2.)) * ovr);
	}
	twk(c, pa, pb, true, fla);
	twk(c, pa, pb, false, blk);
	c += (hs(vec3(gl_FragCoord.xy, 3.1)) - 0.5) / 255.;
	gl_FragColor = vec4(c, 1.);
}`, {
		src: { value: null }, b1: { value: null }, b2: { value: null },
		res: { value: new THREE.Vector2() }, bk: { value: 1 }, blk: { value: 0 }, ovr: { value: 0 }, fla: { value: 0 },
		foc: { value: new THREE.Vector4() }, ovd: { value: new THREE.Vector4(0, 0, -1, 0) }, hol: { value: new THREE.Vector3() }
	})
}

function size() {
	rd.setPixelRatio(pr)
	rd.setSize(innerWidth, innerHeight)
	rd.getDrawingBufferSize(v2)
	W = v2.x
	H = v2.y
	rtA.setSize(W, H)
	rtB.setSize(W, H)
	rtC.setSize(W, H)
	const k = mob ? 4 : 2
	bl[0].setSize(Math.ceil(W / k), Math.ceil(H / k))
	bl[1].setSize(Math.ceil(W / k), Math.ceil(H / k))
	bl[2].setSize(Math.ceil(W / k / 2), Math.ceil(H / k / 2))
	bl[3].setSize(Math.ceil(W / k / 2), Math.ceil(H / k / 2))
	if (lay) {
		lay.camera.aspect = innerWidth / innerHeight
		lay.camera.updateProjectionMatrix()
	}
}

function pass(m, rt) {
	quad.material = m
	rd.setRenderTarget(rt)
	rd.render(quad, ocam)
}

function blur(a, b, x, y) {
	mBlur.uniforms.src.value = a.texture
	mBlur.uniforms.dir.value.set(x / a.width, y / a.height)
	pass(mBlur, b)
}

function draw() {
	const u = mFin.uniforms
	const fx = lay && lay.fx || {}
	u.res.value.set(W, H)
	u.blk.value = Math.max(ov.blk, fx.fade || 0)
	u.fla.value = fx.flash || 0
	u.ovd.value.set(ov.zx, ov.zy, ov.r, ov.w)
	u.ovr.value = ov.rim
	if (!lay || (tr && tr.ph === 'still')) {
		u.src.value = u.b1.value = u.b2.value = bl[3].texture
		u.bk.value = 0
		u.blk.value = 1
		u.fla.value = 0
		u.foc.value.set(0, 0, 0, 0)
		pass(mFin, null)
		return
	}
	const cam = lay.camera
	if (fx.lens) {
		const l = fx.lens
		cam.layers.set(1)
		rd.setRenderTarget(rtB)
		rd.render(lay.scene, cam)
		mLens.uniforms.src.value = rtB.texture
		mLens.uniforms.res.value.set(W, H)
		mLens.uniforms.lz.value.set((l.x + 1) * 0.5 * W, (l.y + 1) * 0.5 * H, l.r * 0.5 * H, l.k)
		mLens.uniforms.dk.value = l.dk
		u.hol.value.set(mLens.uniforms.lz.value.x, mLens.uniforms.lz.value.y, l.r * 0.5 * H)
		pass(mLens, rtA)
		cam.layers.set(0)
		rd.autoClear = false
		rd.clearDepth()
		rd.render(lay.scene, cam)
		rd.autoClear = true
	} else {
		u.hol.value.set(0, 0, 0)
		cam.layers.enableAll()
		rd.setRenderTarget(rtA)
		rd.render(lay.scene, cam)
	}
	let src = rtA
	if (ov.zoom > 0.002) {
		mZoom.uniforms.src.value = rtA.texture
		mZoom.uniforms.ctr.value.set(ov.zx / W, ov.zy / H)
		mZoom.uniforms.amt.value = ov.zoom
		pass(mZoom, rtC)
		src = rtC
	}
	mBri.uniforms.src.value = src.texture
	mBri.uniforms.px.value.set((mob ? 2 : 1) / W, (mob ? 2 : 1) / H)
	pass(mBri, bl[0])
	blur(bl[0], bl[1], 1, 0)
	blur(bl[1], bl[0], 0, 1)
	blur(bl[0], bl[2], 1, 0)
	blur(bl[2], bl[3], 0, 1)
	blur(bl[3], bl[2], 1.8, 0)
	blur(bl[2], bl[3], 0, 1.8)
	u.src.value = src.texture
	u.b1.value = bl[0].texture
	u.b2.value = bl[3].texture
	u.bk.value = fx.bk === undefined ? 1 : fx.bk
	if (fx.foc) u.foc.value.set((fx.foc.x + 1) * 0.5 * W, (fx.foc.y + 1) * 0.5 * H, fx.foc.r * 0.5 * H, fx.foc.k)
	else u.foc.value.set(0, 0, 0, 0)
	pass(mFin, null)
}

function swap(nm, sd) {
	if (lay) {
		lay.dispose()
		lay = null
	}
	lay = nm === 'sky' ? sky.make(rd, 7) : nm === 'ocean' ? ocean.make(rd, 20260924) : wld[nm].make(rd, sd)
	lnm = nm
	lay.camera.aspect = innerWidth / innerHeight
	lay.camera.updateProjectionMatrix()
	lay.fx = {}
	inp.push = 0
	fm.n = fm.s = fm.avg = 0
	fsw = 0
	if (wld[nm] && !vis.includes(nm)) {
		vis.push(nm)
		wrv()
	}
	cnt.textContent = `已到访 ${vis.length} / 5`
	cnt.style.opacity = nm === 'ocean' ? 0.5 : 0
	console.log('切换到', nm, sd === undefined ? '' : '种子 ' + sd)
}

function home() {
	const cam = lay.camera
	const c = bk.tg.at(clk)
	cam.fov = bk.f1
	cam.position.copy(c).addScaledVector(bk.dir, bk.d1)
	cam.lookAt(c)
	cam.updateProjectionMatrix()
	return bk.tg.rad * 4.5 + 3
}

function back() {
	if (tr || !bk || !wld[lnm]) return
	bkb.style.display = 'none'
	tr = rm.matches ? { ph: 'out', t: 0, nm: 'ocean', ret: true } : { ph: 'close', t: 0 }
}

function enter(tg, nm) {
	tip.style.opacity = 0
	rd.domElement.style.cursor = ''
	const cam = lay.camera
	const c = tg.at()
	const d0 = cam.position.distanceTo(c)
	const f1 = cam.fov * 0.45
	const asp = cam.aspect
	let d1 = tg.rad * 0.92 / (Math.tan(f1 * Math.PI / 360) * Math.sqrt(1 + asp * asp))
	d1 = Math.min(Math.max(d1, tg.rad * 1.3), d0 * 0.95)
	const dir = cam.position.clone().sub(c).normalize()
	bk = wld[nm] ? { tg, dir, d1, f0: cam.fov, f1 } : null
	if (rm.matches) {
		tr = { ph: 'out', t: 0, nm, sd: tg.seed }
		return
	}
	const m = new THREE.Matrix4().lookAt(cam.position, c, cam.up)
	tr = {
		ph: 'push', t: 0, nm, sd: tg.seed, tg, d0, d1, f0: cam.fov, f1,
		q0: cam.quaternion.clone(), q1: new THREE.Quaternion().setFromRotationMatrix(m), dir
	}
}

function trans(rt) {
	tr.t += rt
	if (tr.ph === 'push') {
		const cam = lay.camera
		const u = Math.min(tr.t / 2.5, 1)
		const e = Math.pow(u, 2.2)
		const c = tr.tg.at()
		cam.position.copy(c).addScaledVector(tr.dir, tr.d0 + (tr.d1 - tr.d0) * e)
		cam.quaternion.slerpQuaternions(tr.q0, tr.q1, ss(0, 0.45, u))
		cam.fov = tr.f0 + (tr.f1 - tr.f0) * e
		cam.updateProjectionMatrix()
		cam.updateMatrixWorld()
		tmp.copy(c).project(cam)
		inp.push = e
		ov.zoom = Math.pow(e, 1.4) * 0.5
		ov.zx = (tmp.x + 1) * 0.5 * W
		ov.zy = (tmp.y + 1) * 0.5 * H
		ov.blk = ss(0.8, 1, u)
		if (u >= 1) {
			tr.ph = 'still'
			tr.t = 0
			tr.fr = 0
		}
	} else if (tr.ph === 'still') {
		ov.zoom = 0
		ov.blk = 1
		if (!tr.made) {
			if (tr.fr++ < 1) return
			const t0 = performance.now()
			swap(tr.ret ? 'ocean' : tr.nm, tr.sd)
			if (tr.ret) tr.dv = home()
			tr.made = true
			tr.t = (performance.now() - t0) / 1000
			console.log('新场景生成用了', Math.round(tr.t * 1000), 'ms')
		}
		if (tr.t >= 0.4) {
			tr.ph = tr.ret ? 'pull' : wld[lnm] ? 'intro' : 'open'
			tr.t = 0
		}
	} else if (tr.ph === 'intro') {
		ov.blk = 0
		if ((tr.t > 0.1 && !(lay.fx && lay.fx.busy)) || tr.t > 9) {
			tr = null
			bkb.style.display = 'block'
		}
	} else if (tr.ph === 'close') {
		const u = Math.min(tr.t / 1.1, 1)
		const k = Math.min((1 - u) / 0.8, 1)
		ov.zx = W * 0.5
		ov.zy = H * 0.5
		ov.r = Math.hypot(W, H) * 0.56 * (1 - Math.pow(1 - k, 3))
		ov.w = 1 - ss(0.12, 0.95, 1 - u)
		ov.rim = u
		if (u >= 1) {
			ov.r = -1
			ov.rim = 0
			tr = { ph: 'still', t: 0, fr: 0, ret: true }
		}
	} else if (tr.ph === 'pull') {
		const cam = lay.camera
		const u = Math.min(tr.t / 2.5, 1)
		const e = 1 - Math.pow(1 - u, 2.2)
		const c = bk.tg.at(clk)
		cam.position.copy(c).addScaledVector(bk.dir, bk.d1 + (tr.dv - bk.d1) * e)
		cam.lookAt(c)
		cam.fov = bk.f1 + (bk.f0 - bk.f1) * e
		cam.updateProjectionMatrix()
		cam.updateMatrixWorld()
		tmp.copy(c).project(cam)
		ov.zoom = Math.pow(1 - e, 1.4) * 0.5
		ov.zx = (tmp.x + 1) * 0.5 * W
		ov.zy = (tmp.y + 1) * 0.5 * H
		ov.blk = 1 - ss(0, 0.2, u)
		if (u >= 1) {
			ov.zoom = 0
			ov.blk = 0
			tr = null
			bk = null
		}
	} else if (tr.ph === 'open') {
		const u = Math.min(tr.t / 1.1, 1)
		const k = Math.min(u / 0.8, 1)
		ov.blk = 0
		ov.zx = W * 0.5
		ov.zy = H * 0.5
		ov.r = Math.hypot(W, H) * 0.56 * (1 - Math.pow(1 - k, 3))
		ov.w = 1 - ss(0.12, 0.95, u)
		ov.rim = 1 - u
		if (u >= 1) {
			ov.r = -1
			ov.rim = 0
			tr = null
		}
	} else if (tr.ph === 'out') {
		ov.blk = Math.min(tr.t / 0.6, 1)
		if (tr.t >= 0.6) {
			swap(tr.nm, tr.sd)
			if (tr.ret) {
				const cam = lay.camera
				const c = bk.tg.at(clk)
				cam.position.copy(c).addScaledVector(bk.dir, home())
				cam.fov = bk.f0
				cam.lookAt(c)
				cam.updateProjectionMatrix()
				bk = null
			}
			tr.ph = 'in'
			tr.t = 0
		}
	} else if (tr.ph === 'in') {
		ov.blk = 1 - Math.min(tr.t / 0.8, 1)
		if (tr.t >= 0.8) {
			ov.blk = 0
			tr = null
			if (wld[lnm]) bkb.style.display = 'block'
		}
	}
}

function hover() {
	if (mob || !ptr || pts.size) {
		tip.style.opacity = 0
		rd.domElement.style.cursor = ''
		if (!ptr && lay) lay.pick(9, 9, false)
		return
	}
	const t = lay.pick(inp.mx, inp.my, false)
	if (!t) {
		tip.style.opacity = 0
		rd.domElement.style.cursor = ''
		return
	}
	tip.textContent = lnm === 'ocean' ? (vis.includes(t.kind) ? t.nm : '？') : t.tip || ''
	tmp.copy(t.anc).project(lay.camera)
	tip.style.left = ((tmp.x + 1) * 0.5 * innerWidth).toFixed(1) + 'px'
	tip.style.top = ((1 - tmp.y) * 0.5 * innerHeight).toFixed(1) + 'px'
	tip.style.opacity = lnm === 'sky' ? 0.5 : 0.75
	rd.domElement.style.cursor = 'pointer'
}

function click() {
	if (tr || !lay) return
	const t = lay.pick(inp.mx, inp.my, true)
	if (!t) return
	if (lnm === 'sky') enter(t, 'ocean')
	else if (lnm === 'ocean' && wld[t.go]) enter(t, t.go)
}

function meter(raw) {
	ft = ft * 0.94 + raw * 0.06
	if (!tr) {
		fsw += raw
		fchk += raw
		if (fchk > 3 && fsw > 4) {
			fchk = 0
			if (ft > 0.024 && pr > 1) {
				pr = Math.max(1, pr - 0.25)
				size()
				console.log('帧率有点吃紧，像素比降到', pr)
			}
		}
		if (fm.s < 30) {
			fm.n++
			fm.s += raw
			if (fm.s >= 30) fm.avg = fm.n / fm.s
		}
	}
	if (fpe.style.display !== 'none') {
		const a = fm.avg ? fm.avg.toFixed(1) : `${Math.floor(fm.s)}s…`
		fpe.textContent = `${lnm}  ${(1 / ft).toFixed(0)} fps\n30秒均值 ${a}\n像素比 ${pr}`
	}
}

function frame(now) {
	if (!run) return
	requestAnimationFrame(frame)
	const raw = Math.min(Math.max((now - last) / 1000, 0), 0.1)
	last = now
	meter(raw)
	const dt = Math.min(raw, 0.05) * (rm.matches ? 0.5 : 1)
	if (tr) trans(Math.min(raw, 0.05))
	if (lay && !(tr && tr.ph === 'still')) {
		clk += dt
		inp.fly = !!tr && (tr.ph === 'push' || tr.ph === 'pull')
		inp.rm = rm.matches
		lay.fx = lay.update(dt, clk, inp) || {}
		if (!tr) hover()
	}
	draw()
	inp.dx = inp.dy = inp.wh = 0
}

function ndc(e) {
	inp.mx = e.clientX / innerWidth * 2 - 1
	inp.my = 1 - e.clientY / innerHeight * 2
}

function bind() {
	const cv = rd.domElement
	cv.addEventListener('pointerdown', e => {
		cv.setPointerCapture(e.pointerId)
		pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
		pd = pts.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now(), mv: 0 } : null
		inp.hold = !tr
		if (pts.size === 2) {
			const [a, b] = [...pts.values()]
			pin = Math.hypot(a.x - b.x, a.y - b.y)
		}
		ndc(e)
	})
	cv.addEventListener('pointermove', e => {
		ndc(e)
		ptr = true
		const p = pts.get(e.pointerId)
		if (!p) return
		const dx = e.clientX - p.x, dy = e.clientY - p.y
		p.x = e.clientX
		p.y = e.clientY
		if (pd) pd.mv += Math.abs(dx) + Math.abs(dy)
		if (tr) return
		if (pts.size === 2) {
			const [a, b] = [...pts.values()]
			const d = Math.hypot(a.x - b.x, a.y - b.y)
			inp.wh -= (d - pin) * 3
			pin = d
		} else {
			inp.dx += dx
			inp.dy += dy
		}
	})
	const up = e => {
		const had = pts.delete(e.pointerId)
		if (had && pd && e.type === 'pointerup' && pd.mv < 8 && performance.now() - pd.t < 650) {
			ndc(e)
			click()
		}
		if (!pts.size) {
			pd = null
			inp.hold = false
		}
	}
	cv.addEventListener('pointerup', up)
	cv.addEventListener('pointercancel', up)
	cv.addEventListener('pointerleave', () => {
		ptr = false
	})
	cv.addEventListener('wheel', e => {
		e.preventDefault()
		if (!tr) inp.wh += e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1)
	}, { passive: false })
	cv.addEventListener('webglcontextlost', e => {
		e.preventDefault()
		run = false
		console.log('WebGL 上下文丢了')
		cv.style.display = 'none'
		if (fail) fail('显卡那边断开了，刷新一下再看。')
	})
	addEventListener('resize', size)
	bkb.addEventListener('click', back)
	addEventListener('keydown', e => {
		if (e.key === 'Escape') back()
	})
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			run = false
		} else if (!run && cv.style.display !== 'none') {
			run = true
			last = performance.now()
			requestAnimationFrame(frame)
		}
	})
}

export function start(fb) {
	fail = fb
	rd = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false })
	rd.mob = mob
	rd.toneMapping = THREE.ACESFilmicToneMapping
	rd.toneMappingExposure = 1
	rd.outputColorSpace = THREE.SRGBColorSpace
	document.body.prepend(rd.domElement)
	const hf = { type: THREE.HalfFloatType }
	rtA = new THREE.WebGLRenderTarget(1, 1, { ...hf, samples: mob ? 0 : 4 })
	rtB = new THREE.WebGLRenderTarget(1, 1, hf)
	rtB.texture.wrapS = rtB.texture.wrapT = THREE.MirroredRepeatWrapping
	rtC = new THREE.WebGLRenderTarget(1, 1, { ...hf, depthBuffer: false })
	bl = [0, 1, 2, 3].map(() => new THREE.WebGLRenderTarget(1, 1, { ...hf, depthBuffer: false }))
	quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
	quad.frustumCulled = false
	ocam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
	mats()
	size()
	if (qs.has('fps')) fpe.style.display = 'block'
	swap('sky')
	tr = { ph: 'in', t: 0 }
	ov.blk = 1
	bind()
	last = performance.now()
	requestAnimationFrame(frame)
	console.log('启动好了', mob ? '手机模式' : '桌面模式', rm.matches ? '减少动态' : '')
}
