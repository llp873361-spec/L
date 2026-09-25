import * as THREE from 'three'
import { glsl, nois } from '../palette.js'

function rng(s) {
	let a = s >>> 0
	return () => {
		a = a + 0x6D2B79F5 >>> 0
		let t = a
		t = Math.imul(t ^ t >>> 15, t | 1)
		t ^= t + Math.imul(t ^ t >>> 7, t | 61)
		return ((t ^ t >>> 14) >>> 0) / 4294967296
	}
}

const sst = (a, b, x) => {
	const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
	return t * t * (3 - 2 * t)
}

const f4 = v => '(' + v.toFixed(4) + ')'
const wsz = 80

const fgl = (dw, sn, pp) => `
uniform float ut, wt, wk, lw, wi, fd, sfg;
const vec2 dwn = vec2(${f4(dw.x)}, ${f4(dw.y)});
const vec3 sn = vec3(${f4(sn.x)}, ${f4(sn.y)}, ${f4(sn.z)});
float pth(float z) {
	return ${f4(pp[0])} * (sin(z * ${f4(pp[1])} + ${f4(pp[2])}) - ${f4(Math.sin(pp[2]))}) + ${f4(pp[3])} * (sin(z * ${f4(pp[4])} + ${f4(pp[5])}) - ${f4(Math.sin(pp[5]))}) + ${f4(pp[6])};
}
vec2 wnd(vec2 p) {
	float a = dot(p, dwn), b = dot(p, vec2(-dwn.y, dwn.x));
	float n = vn(vec3(p * 0.045, wt * 0.05));
	float g = pow(0.5 + 0.5 * sin(a * 0.34 - wt * 1.9 + n * 3. + sin(b * 0.07) * 1.2), 5. - 1.6 * (wk - 1.)) * wi;
	float ld = exp(-pow((a - lw) / 3.2, 2.));
	return vec2((0.18 + 0.9 * max(g, ld)) * wk, (vn(vec3(p * 0.03, wt * 0.03 + 5.)) - 0.5) * 0.6);
}
float mst(vec3 d) {
	float sd = max(dot(d, sn), 0.);
	return clamp(0.5 + 0.42 * exp(-max(d.y, 0.) * 5.) + (0.3 * pow(sd, 8.) + 0.7 * pow(sd, 260.)) * (1. - sfg), 0., 2.);
}
vec3 msc(float t, out vec3 a, out vec3 b) {
	return cpos(pk3, pk6, pk7, pk7, carc(pk3, pk6, pk7, pk7, vec4(0., 1., 2., 3.), t), a, b);
}
float fgt(vec3 wp, float to, out float tf) {
	vec3 d = wp - cameraPosition;
	float l = length(d);
	d /= l;
	tf = mst(vec3(d.x, 0.02, d.z)) - 0.08 + (to - 0.55 * smoothstep(80., 350., l)) * (1. - sfg);
	float y0 = cameraPosition.y, y1 = wp.y;
	float e0 = exp(-y0 / 14.), e1 = exp(-y1 / 14.);
	float hf = abs(y1 - y0) > 0.01 ? (e0 - e1) * 14. / (y1 - y0) : e0;
	return 1. - exp(-l * (hf / fd + 0.001));
}
vec4 pet(float v, vec3 wp, float to) {
	float tf;
	float ff = fgt(wp, to, tf);
	vec3 a, b;
	return vec4(dsp(fgw(pk2, pk4, pk5, pk6, vec4(0., 0.35, 0.68, 1.), v, 3., pk3, pk6, pk7, pk7, 1., tf, ff, a, b)), 1.);
}
`

function fgeo(n, len, wid, cup, rows) {
	const P = [], N = [], K = [], I = []
	for (let r = 0; r < 7; r++) {
		const t = r / 6
		for (const sd of [-1, 1]) {
			P.push(0, 0, 0)
			N.push(0, 0, 1)
			K.push(0, t, sd)
		}
		if (r) {
			const o = (r - 1) * 2
			I.push(o, o + 1, o + 3, o, o + 3, o + 2)
		}
	}
	for (let i = 0; i < n; i++) {
		const a = i / n * Math.PI * 2 + (i % 2) * 0.12
		const ux = Math.cos(a), uz = Math.sin(a), qx = -uz, qz = ux
		const o = P.length / 3
		for (let r = 0; r <= rows; r++) {
			const t = r / rows
			const rr = 0.012 + t * len
			const cp = cup * (0.55 + 0.45 * t)
			const cx = ux * rr * Math.cos(cp), cy = rr * Math.sin(cp), cz = uz * rr * Math.cos(cp)
			for (const sd of [-1, 1]) {
				const w = wid * 0.5 * sd
				P.push(cx + qx * w, cy, cz + qz * w)
				N.push(-ux * Math.sin(cp), Math.cos(cp), -uz * Math.sin(cp))
				K.push(1, t, sd)
			}
			if (r) {
				const b = o + (r - 1) * 2
				I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2)
			}
		}
	}
	const o = P.length / 3
	P.push(0, 0.014, 0)
	N.push(0, 1, 0)
	K.push(2, 0, 0)
	for (let i = 0; i < 6; i++) {
		const a = i / 6 * Math.PI * 2
		P.push(Math.cos(a) * 0.021, 0.009, Math.sin(a) * 0.021)
		N.push(0, 1, 0)
		K.push(2, 1, 0)
		I.push(o, o + 1 + (i + 1) % 6, o + 1 + i)
	}
	const g = new THREE.BufferGeometry()
	g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
	g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3))
	g.setAttribute('kd', new THREE.Float32BufferAttribute(K, 3))
	g.setIndex(I)
	return g
}

export function make(rd, seed) {
	const mob = !!rd.mob
	const nf = mob ? 15000 : 50000
	const fr = mob ? 24 : 33.5
	const R = rng(seed)
	const S = rng(seed ^ 0x5bd1e995)
	const dw = new THREE.Vector2(S() * 0.8 - 0.4, -1).normalize()
	const sn = new THREE.Vector3(S() * 0.9 - 0.45, 0.12, -1).normalize()
	const pp = [2 + S() * 2, 0.035 + S() * 0.025, S() * 6.283, 3 + S() * 3, 0.01 + S() * 0.008, S() * 6.283, (S() < 0.5 ? -1 : 1) * (0.5 + S() * 0.6)].map(v => +v.toFixed(4))
	const pth = z => pp[0] * (Math.sin(z * pp[1] + pp[2]) - Math.sin(pp[2])) + pp[3] * (Math.sin(z * pp[4] + pp[5]) - Math.sin(pp[5])) + pp[6]
	const fg = fgl(dw, sn, pp)
	const h0 = 0.3 + S() * 0.35
	const hue = [h0, Math.min(Math.max(h0 + (S() < 0.5 ? -1 : 1) * (0.12 + S() * 0.12), 0.3), 0.7), 0.8 + S() * 0.08]
	const mixw = [0.45 + S() * 0.3, S() * 0.3]
	const shr = [0.3 + S() * 0.4, 0.2 + S() * 0.4, 0.1 + S() * 0.3]
	const sht = shr[0] + shr[1] + shr[2]
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.05, 2000)
	const cam0 = new THREE.Vector3(0, 1.55, 0)
	const ctr = new THREE.Vector2(cam0.x - wsz / 2, cam0.z - wsz / 2)
	const u = {
		ut: { value: 0 }, wt: { value: 0 }, wk: { value: 1 }, lw: { value: -999 }, wi: { value: 0 }, fd: { value: 0.4 }, sfg: { value: 1 },
		wtx: { value: null }, org: { value: ctr }, trs: { value: mob ? 0 : 1 }
	}
	const hw = []
	for (let i = 0; i < 5; i++) {
		const a = R() * Math.PI * 2, wl = 160 + R() * 280
		hw.push([Math.cos(a) * 6.283 / wl, Math.sin(a) * 6.283 / wl, R() * 6.283, 1.6 + R() * 1.8])
	}
	const hmx = hw.reduce((s, w) => s + w[3], 0)
	const hgt = (x, z) => {
		const r = Math.hypot(x, z)
		const k = sst(60, 300, r) * (0.6 + 0.4 * sst(300, 800, r))
		if (k <= 0) return 0
		let h = hmx
		for (const w of hw) h += Math.sin(x * w[0] + z * w[1] + w[2]) * w[3]
		return h * k
	}

	const wrt = new THREE.WebGLRenderTarget(128, 128, { type: THREE.HalfFloatType, depthBuffer: false })
	u.wtx.value = wrt.texture
	const wq = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
		uniforms: u,
		depthTest: false,
		depthWrite: false,
		vertexShader: `varying vec2 vu;
void main() {
	vu = uv;
	gl_Position = vec4(position.xy, 0., 1.);
}`,
		fragmentShader: `${glsl}
${nois}
${fg}
uniform vec2 org;
varying vec2 vu;
void main() {
	gl_FragColor = vec4(wnd(org + vu * ${f4(wsz)}), 0., 1.);
}`
	}))
	wq.frustumCulled = false
	const wcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

	const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), new THREE.ShaderMaterial({
		side: THREE.BackSide,
		depthWrite: false,
		uniforms: u,
		vertexShader: `varying vec3 vd;
void main() {
	vd = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`,
		fragmentShader: `${glsl}
${nois}
${fg}
varying vec3 vd;
void main() {
	vec3 d = normalize(vd);
	float t = mst(d) + 0.05 * (fbm(vec3(d.x * 3. / (d.y + 0.25), d.z * 3. / (d.y + 0.25), 2.)) - 0.5) * smoothstep(0.02, 0.2, d.y);
	t = mix(t, mst(vec3(d.x, 0.02, d.z)) - 0.08, sfg);
	vec3 a, b;
	gl_FragColor = vec4(dsp(msc(t, a, b)), 1.);
}`
	}))
	sky.renderOrder = -1
	scene.add(sky)

	{
		const K = 110, M = 160, P = [], I = []
		for (let i = 0; i <= K; i++) {
			const r = 900 * Math.pow(i / K, 1.7)
			for (let j = 0; j < M; j++) {
				const a = j / M * Math.PI * 2
				const x = cam0.x + Math.cos(a) * r, z = cam0.z + Math.sin(a) * r
				P.push(x, hgt(x, z), z)
				if (i) {
					const p0 = (i - 1) * M + j, p1 = (i - 1) * M + (j + 1) % M
					I.push(p0, p1 + M, p0 + M, p0, p1, p1 + M)
				}
			}
		}
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
		g.setIndex(I)
		g.computeVertexNormals()
		scene.add(new THREE.Mesh(g, new THREE.ShaderMaterial({
			uniforms: u,
			vertexShader: `varying vec3 vw, vn0;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.);
	vw = w.xyz;
	vn0 = normal;
	gl_Position = projectionMatrix * viewMatrix * w;
}`,
			fragmentShader: `${glsl}
${nois}
${fg}
varying vec3 vw, vn0;
void main() {
	vec2 p = vw.xz;
	float l = distance(vw, cameraPosition);
	float pm = (1. - smoothstep(0.16, 0.38, abs(p.x - pth(p.y)))) * (1. - smoothstep(60., 140., l));
	float lf = vn(vec3(p * 3.1, 2.)) * 0.6 + vn(vec3(p * 9., 4.)) * 0.4;
	float v0 = 0.02 + 0.14 * lf;
	vec2 q = p * 5.5;
	vec2 id = floor(q), f = fract(q) - 0.5;
	float h = hs(id);
	float dt = 1. - smoothstep(0.2, 0.4, length(f - (vec2(hs(id + 3.1), hs(id + 7.7)) - 0.5) * 0.4));
	float aa = clamp(1.5 - length(fwidth(q)) * 1.8, 0., 1.);
	vec2 w = wnd(p);
	float fp = smoothstep(0.5, 1.2, w.x) * (1. - smoothstep(35., 80., l));
	float vf = mix(h < ${f4(mixw[0])} ? ${f4(hue[0])} : ${f4(hue[1])}, 0.9, fp * 0.9) + 0.06 * (hs(id + 1.7) - 0.5);
	float cov = smoothstep(${f4(fr * 0.66)}, ${f4(fr * 0.955)}, l) * (1. - pm);
	float v = mix(v0, mix(${f4(hue[0] * mixw[0] + hue[1] * (1 - mixw[0]))} + 0.35 * fp, vf, aa), cov * mix(dt, 0.85, 1. - aa));
	v = mix(v, 1., smoothstep(40., 220., l));
	v = mix(v, 0.19 + 0.06 * lf, pm);
	gl_FragColor = pet(v, vw, 0.35 * (dot(normalize(vn0), sn) - 0.12) * smoothstep(80., 250., l));
}`
		})))
	}

	const types = [
		{ n: 5, len: 0.085, wid: 0.075, cup: 0.6, rows: 2, h0: 0.38, h1: 0.62, share: shr[0] / sht },
		{ n: 9, len: 0.078, wid: 0.03, cup: 0.2, rows: 1, h0: 0.32, h1: 0.52, share: shr[1] / sht },
		{ n: 4, len: 0.075, wid: 0.065, cup: 1.08, rows: 2, h0: 0.45, h1: 0.72, share: shr[2] / sht }
	]
	const fls = []
	types.forEach(ty => {
		const cnt = Math.floor(nf * ty.share)
		const ai = new Float32Array(cnt * 4), ac = new Float32Array(cnt * 4)
		let i = 0, gd = 0
		while (i < cnt && gd++ < cnt * 4) {
			const r = 0.7 + Math.pow(R(), 0.62) * (fr - 0.7), a = -Math.PI / 2 + (R() - 0.5) * 2.5
			const x = cam0.x + Math.cos(a) * r, z = cam0.z + Math.sin(a) * r
			if (Math.abs(x - pth(z)) < 0.26 + R() * 0.12) continue
			const q = R()
			const hv = q < mixw[0] ? hue[0] : q < mixw[0] + mixw[1] ? hue[2] : hue[1]
			ai.set([x, z, ty.h0 + R() * (ty.h1 - ty.h0), R() * 6.283], i * 4)
			ac.set([hv + (R() - 0.5) * 0.06, 0.8 + R() * 0.5, R(), R()], i * 4)
			i++
		}
		const g = fgeo(ty.n, ty.len, ty.wid, ty.cup, ty.rows)
		g.setAttribute('ai', new THREE.InstancedBufferAttribute(ai.subarray(0, i * 4), 4))
		g.setAttribute('ac', new THREE.InstancedBufferAttribute(ac.subarray(0, i * 4), 4))
		const mat = new THREE.ShaderMaterial({
			uniforms: u,
			side: THREE.DoubleSide,
			vertexShader: `${glsl}
${nois}
${fg}
attribute vec3 kd;
attribute vec4 ai, ac;
uniform sampler2D wtx;
uniform vec2 org;
varying vec3 vw, vnr, vk;
varying vec4 vc;
vec3 rty(vec3 v, float a) {
	float c = cos(a), s = sin(a);
	return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
}
vec3 rta(vec3 v, vec3 k, float a) {
	float c = cos(a), s = sin(a);
	return v * c + cross(k, v) * s + k * dot(k, v) * (1. - c);
}
vec2 dl, wd;
float th0, kk, wa, wb;
vec3 tgf(float s) {
	float th = th0 * (0.6 + 0.8 * s) + kk * s * s;
	float al = wa * (0.1 + 0.9 * s * s);
	vec2 h = dl * sin(th) + wd * sin(al) + vec2(-wd.y, wd.x) * wb * s;
	return normalize(vec3(h.x, cos(th) * cos(al), h.y));
}
vec3 crv(float s) {
	return (tgf(0.2113249 * s) + tgf(0.7886751 * s)) * 0.5 * s;
}
void main() {
	vec3 rt = vec3(ai.x, 0., ai.y);
	vec2 w = texture2D(wtx, (rt.xz - org) / ${f4(wsz)}).xy;
	float c = cos(w.y), s = sin(w.y);
	wd = vec2(dwn.x * c - dwn.y * s, dwn.x * s + dwn.y * c);
	float h1 = fract(ac.z * 13.7), h2 = fract(ac.w * 5.3), h3 = fract(ac.z * 7.1 + ac.w * 3.3);
	dl = vec2(cos(ac.w * 43.98), sin(ac.w * 43.98));
	th0 = 0.05 + 0.27 * h1;
	kk = -0.25 + 0.8 * h2;
	float fq = 2.2 + 1.6 * h2 + (0.6 - ai.z) * 2.;
	float os = sin(ut * fq + ac.w * 6.283 + ai.x * 1.3);
	wa = min(w.x * 0.95 * (0.6 + 0.8 * h3) + os * (0.05 + 0.12 * w.x), 1.45);
	wb = sin(ut * fq * 1.3 + ac.z * 6.283) * 0.04 * (0.4 + w.x);
	float lod = 1. - smoothstep(${f4(fr * 0.75)}, ${f4(fr)}, distance(rt.xz, cameraPosition.xz));
	float H = ai.z * lod;
	float fp = smoothstep(0.5, 1.15, wa);
	vec3 p, n;
	if (kd.x < 0.5) {
		float t = kd.y;
		vec3 cc = rt + crv(t) * H;
		vec3 tc = normalize(cameraPosition - cc);
		vec3 ac2 = cross(tgf(t), tc);
		p = cc + ac2 / max(length(ac2), 1e-4) * kd.z * 0.0045 * lod;
		n = tc;
		vc = vec4(ac.x, ac.z, 0., lod);
	} else {
		vec3 hd = rt + crv(1.) * H;
		vec3 tt = tgf(1.);
		float tl = acos(clamp(tt.y, -1., 1.));
		vec3 ax = cross(vec3(0., 1., 0.), tt);
		float sl = length(ax);
		vec3 k = sl > 1e-4 ? ax / sl : vec3(1., 0., 0.);
		p = hd + rta(rty(position * ac.y * lod, ai.w), k, tl);
		n = rta(rty(normal, ai.w), k, tl);
		vc = vec4(ac.x, ac.z, fp, lod);
	}
	vw = p;
	vnr = n;
	vk = kd;
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
}`,
			fragmentShader: `${glsl}
${nois}
${fg}
uniform float trs;
varying vec3 vw, vnr, vk;
varying vec4 vc;
void main() {
	float v;
	if (vk.x < 0.5) {
		v = 0.1 + 0.2 * vk.y + 0.06 * vc.y;
	} else if (vk.x < 1.5) {
		float t = vk.y;
		if (abs(vk.z) > 1. - pow(max(t * 1.3 - 0.3, 0.), 2.2) * 0.9 || t > 0.98) discard;
		vec3 V = normalize(vw - cameraPosition);
		float bl = pow(max(dot(V, sn), 0.), 3.) * trs;
		float lt = dot(normalize(vnr) * (gl_FrontFacing ? 1. : -1.), sn);
		v = vc.x - (1. - t) * 0.1 + (gl_FrontFacing ? 0. : 0.1) + 0.07 * lt;
		v = mix(v, 0.88 + 0.08 * vc.y, vc.z * 0.9);
		v += bl * 0.16;
	} else {
		v = 0.78 + 0.12 * vc.y - vk.y * 0.06;
	}
	gl_FragColor = pet(v, vw, 0.);
}`
		})
		const im = new THREE.InstancedMesh(g, mat, i)
		im.frustumCulled = false
		scene.add(im)
		fls.push(im)
	})

	{
		const nl = mob ? 8000 : 24000
		const P = [], B = [], I = []
		for (let r = 0; r <= 5; r++) {
			P.push(0, 0, 0, 0, 0, 0)
			B.push(r, -1, r, 1)
			if (r) {
				const o = (r - 1) * 2
				I.push(o, o + 1, o + 3, o, o + 3, o + 2)
			}
		}
		const g = new THREE.InstancedBufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
		g.setAttribute('bp', new THREE.Float32BufferAttribute(B, 2))
		g.setIndex(I)
		const la = new Float32Array(nl * 4), lb = new Float32Array(nl * 4)
		let i = 0
		while (i < nl) {
			const r = 0.8 + Math.pow(R(), 0.7) * (fr * 0.62 - 0.8), a = -Math.PI / 2 + (R() - 0.5) * 2.5
			const x = cam0.x + Math.cos(a) * r, z = cam0.z + Math.sin(a) * r
			if (Math.abs(x - pth(z)) < 0.2) continue
			const m = 3 + Math.floor(R() * 4)
			for (let k = 0; k < m && i < nl; k++, i++) {
				la.set([x + (R() - 0.5) * 0.06, z + (R() - 0.5) * 0.06, 0.12 + R() * 0.22, R() * 6.283], i * 4)
				lb.set([0.15 + R() * 0.5, 0.4 + R() * 1.4, 0.008 + R() * 0.008, R()], i * 4)
			}
		}
		g.setAttribute('la', new THREE.InstancedBufferAttribute(la, 4))
		g.setAttribute('lb', new THREE.InstancedBufferAttribute(lb, 4))
		g.instanceCount = nl
		const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
			uniforms: u,
			side: THREE.DoubleSide,
			vertexShader: `${glsl}
${nois}
${fg}
attribute vec2 bp;
attribute vec4 la, lb;
uniform sampler2D wtx;
uniform vec2 org;
varying vec3 vw;
varying vec2 vb;
varying float vr;
vec2 dl, wd;
float wa;
vec3 tgl(float s) {
	float th = lb.x + lb.y * s * s;
	float al = wa * (0.2 + 0.8 * s);
	vec2 h = dl * sin(th) + wd * sin(al);
	return normalize(vec3(h.x, cos(th) * cos(al), h.y));
}
void main() {
	vec2 w = texture2D(wtx, (la.xy - org) / ${f4(wsz)}).xy;
	float c = cos(w.y), s = sin(w.y);
	wd = vec2(dwn.x * c - dwn.y * s, dwn.x * s + dwn.y * c);
	dl = vec2(cos(la.w), sin(la.w));
	wa = min(w.x * 0.5, 0.9) + sin(ut * 4.3 + lb.w * 6.283 + la.x) * 0.05 * (0.3 + w.x);
	float u = bp.x / 5.;
	float lod = 1. - smoothstep(${f4(fr * 0.45)}, ${f4(fr * 0.62)}, distance(la.xy, cameraPosition.xz));
	vec3 p = vec3(la.x, 0., la.y) + (tgl(0.2113249 * u) + tgl(0.7886751 * u)) * 0.5 * u * la.z * lod;
	p += vec3(-dl.y, 0., dl.x) * bp.y * lb.z * (1. - pow(u, 1.6) * 0.9) * lod * 0.5;
	vw = p;
	vb = vec2(u, bp.y);
	vr = lb.w;
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
}`,
			fragmentShader: `${glsl}
${nois}
${fg}
uniform float trs;
varying vec3 vw;
varying vec2 vb;
varying float vr;
void main() {
	float bl = pow(max(dot(normalize(vw - cameraPosition), sn), 0.), 3.) * trs;
	float v = 0.04 + 0.26 * vb.x + 0.1 * vr - 0.04 * (1. - abs(vb.y)) + bl * 0.25 * vb.x;
	gl_FragColor = pet(v, vw, 0.);
}`
		}))
		m.frustumCulled = false
		scene.add(m)
	}

	{
		const np = mob ? 250 : 500
		const g = new THREE.InstancedBufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3))
		g.setIndex([0, 1, 2, 0, 2, 3])
		const pa = new Float32Array(np * 4), pb = new Float32Array(np * 4)
		for (let i = 0; i < np; i++) {
			const a = -3 + R() * 10, b = (R() - 0.5) * 12
			pa.set([cam0.x + dw.x * a - dw.y * b, 0.35 + R() * 0.35, cam0.z + dw.y * a + dw.x * b, R() * 20], i * 4)
			pb.set([7 + R() * 5, R() * 6.283, 1.5 + R() * 2.5, hue[Math.floor(R() * 3)]], i * 4)
		}
		g.setAttribute('pa', new THREE.InstancedBufferAttribute(pa, 4))
		g.setAttribute('pb', new THREE.InstancedBufferAttribute(pb, 4))
		g.instanceCount = np
		const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
			uniforms: u,
			side: THREE.DoubleSide,
			vertexShader: `${glsl}
${nois}
${fg}
attribute vec4 pa, pb;
varying vec3 vw;
varying vec2 vq;
varying float va, vh;
void main() {
	float tau = mod(wt * 1.4 + pa.w, pb.x);
	vec3 c = pa.xyz + vec3(dwn.x, 0., dwn.y) * tau * 2.6 + vec3(sin(tau * 1.7 + pb.y) * 0.5, tau * 0.25 + (1. - exp(-tau * 1.4)) * 0.9 + sin(tau * 2.3 + pb.y) * 0.18, cos(tau * 1.3 + pb.y) * 0.5);
	float a1 = tau * pb.z + pb.y, a2 = tau * pb.z * 0.7 + pb.y * 2.;
	vec3 x = vec3(cos(a1), sin(a1) * cos(a2), sin(a1) * sin(a2));
	vec3 y = normalize(cross(x, vec3(0.3, 1., 0.2)));
	vec2 q = position.xy * vec2(0.06, 0.042);
	float th = fract(pa.w * 7.31);
	va = smoothstep(0., 1., tau) * (1. - smoothstep(pb.x - 1.5, pb.x, tau)) * smoothstep(th - 0.08, th + 0.08, 0.4 + 0.6 * smoothstep(1., 2.3, wk));
	vh = pb.w;
	vq = position.xy * 2.;
	vw = c + (x * q.x + y * q.y) * va;
	gl_Position = projectionMatrix * viewMatrix * vec4(vw, 1.);
}`,
			fragmentShader: `${glsl}
${nois}
${fg}
uniform float trs;
varying vec3 vw;
varying vec2 vq;
varying float va, vh;
void main() {
	if (va < 0.02 || length(vec2(vq.x, vq.y * (1.15 + 0.35 * vq.x))) > 1.) discard;
	float bl = pow(max(dot(normalize(vw - cameraPosition), sn), 0.), 3.) * trs;
	gl_FragColor = pet((gl_FrontFacing ? vh + 0.2 : 0.86) + bl * 0.2, vw, 0.);
}`
		}))
		m.frustumCulled = false
		scene.add(m)
	}

	const ti = 5
	const ca = cam0.x * dw.x + cam0.z * dw.y
	let it = -1, lx = 0, ly = 0, hold = 1
	const look = new THREE.Vector3()

	function vfov() {
		const a = camera.aspect
		return a < 1 ? Math.min(2 * Math.atan(Math.tan(27.5 * Math.PI / 180) / a) * 180 / Math.PI, 85) : 55
	}

	function update(dt, t, inp) {
		if (it < 0) it = inp.rm ? 20 : 0
		it += dt
		const fv = vfov()
		if (camera.fov !== fv) {
			camera.fov = fv
			camera.updateProjectionMatrix()
		}
		const tgt = inp.hold ? (inp.rm ? 1.6 : 2.3) : 1
		hold += (tgt - hold) * (1 - Math.exp(-dt * (tgt > hold ? 0.55 : 0.4)))
		u.ut.value = t
		u.wk.value = hold
		u.wt.value += dt * (0.55 + 0.45 * hold)
		u.wi.value = sst(5.5, 8, it)
		u.fd.value = 0.4 + 220 * Math.pow(sst(0.3, 4.4, it), 2.2)
		u.sfg.value = 1 - sst(1.4, 4.4, it)
		u.lw.value = Math.min(ca - 7 + (it - 3.25) * 5.6, 400)
		rd.setRenderTarget(wrt)
		rd.render(wq, wcam)
		rd.setRenderTarget(null)
		lx += (inp.mx * 0.15 - lx) * (1 - Math.exp(-dt * 4))
		ly += (inp.my * 0.07 - ly) * (1 - Math.exp(-dt * 4))
		camera.position.copy(cam0)
		camera.position.y += Math.sin(t * 0.7) * 0.012
		const pt = camera.aspect < 1 ? 1.25 + (1 - camera.aspect) * 2.6 : 1.25
		look.set(cam0.x + Math.sin(lx) * 10, cam0.y - pt + ly * 10, cam0.z - 10)
		camera.lookAt(look)
		camera.updateMatrixWorld()
		sky.position.copy(camera.position)
		return { busy: it < ti, fade: 1 - sst(0, 0.45, it), bk: 0.3 }
	}

	function pick() {
		return null
	}

	function dispose() {
		scene.traverse(q => {
			if (q.geometry) q.geometry.dispose()
			if (q.material) q.material.dispose()
		})
		fls.forEach(q => q.dispose())
		wq.geometry.dispose()
		wq.material.dispose()
		wrt.dispose()
	}

	return { scene, camera, update, pick, dispose }
}
