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

const fl = v => '(' + (+v).toPrecision(9) + ')'

const dgl = ca => `
uniform float ut, wh;
uniform vec3 sn;
vec3 dch(float t) {
	t = clamp(t, 0., 4.);
	vec3 dv = mix(pk4, pk2, 0.18);
	return t < 1. ? mix(dv, pk4, t) : t < 2. ? mix(pk4, pk3, t - 1.) : t < 3. ? mix(pk3, pk6, t - 2.) : mix(pk6, pk7, t - 3.);
}
float hzt(vec3 d) {
	vec2 h = normalize(d.xz + vec2(1e-5, 0.));
	return 3.32 + 0.24 * pow(max(dot(h, normalize(sn.xz)), 0.), 2.);
}
float sky(vec3 d) {
	float s = max(dot(d, sn), 0.), y = max(d.y, 0.);
	float t = mix(hzt(d), 2.78, smoothstep(0., 0.45, y));
	vec2 p = d.xz / (y + 0.06);
	p = vec2(p.x * ${Math.cos(ca).toFixed(4)} + p.y * ${Math.sin(ca).toFixed(4)}, p.y * ${Math.cos(ca).toFixed(4)} - p.x * ${Math.sin(ca).toFixed(4)});
	float c = fbm(vec3(p.x * 0.35, p.y * 2.2, 3.1)) + 0.3 * fbm(vec3(p.x * 1.4, p.y * 7., 5.7));
	t = mix(t, 3.6, smoothstep(0.7, 0.98, c) * smoothstep(0.03, 0.14, y) * 0.4);
	return min(t + 0.45 * pow(s, 12.) + 0.3 * pow(s, 90.), 4.);
}
`

const tgl = k => `
const uint sdv = ${k.sdv}u;
const vec2 w1 = vec2(${fl(k.w1.x)}, ${fl(k.w1.y)}), w2 = vec2(${fl(k.w2.x)}, ${fl(k.w2.y)}), c1 = vec2(${fl(-k.w1.y)}, ${fl(k.w1.x)});
const vec2 co = vec2(${fl(k.cx)}, ${fl(k.cz)});
const float L1 = ${fl(k.l1)}, H1 = ${fl(k.h1)}, LA1 = ${fl(k.la1)}, LB1 = ${fl(k.lb1)};
const float L2 = ${fl(k.l2)}, H2 = ${fl(k.h2)}, LA2 = ${fl(k.la2)}, LB2 = ${fl(k.lb2)};
const float AW1 = ${fl(k.aw1)}, F1 = ${fl(k.f1)}, AW2 = ${fl(k.aw2)}, F2 = ${fl(k.f2)}, AW3 = ${fl(k.aw3)}, F3 = ${fl(k.f3)}, AW4 = ${fl(k.aw4)}, F4 = ${fl(k.f4)};
const float FAC = ${fl(k.fac)}, FAW = ${fl(k.faw)}, FA2 = ${fl(k.fa2)}, HD = ${fl(k.hd)}, FD = ${fl(k.fd)}, HM = ${fl(k.hm)}, FM = ${fl(k.fm)};
const float GH = ${fl(k.gh)}, GU = ${fl(k.gu)}, GS = ${fl(k.gs)}, GV = ${fl(k.gv)};
const float R0 = ${fl(k.r0)}, LNR = ${fl(k.lnr)}, HMX = ${fl(k.hmx)};
float hh(ivec2 q, uint s) {
	uint h = uint(q.x) * 374761393u + uint(q.y) * 668265263u + sdv + s * 2246822519u;
	h = (h ^ (h >> 13u)) * 1274126177u;
	return float(h ^ (h >> 16u)) / 4294967296.;
}
vec3 vnd(vec2 p, uint s) {
	vec2 i = floor(p), f = p - i;
	ivec2 q = ivec2(i);
	float a = hh(q, s), b = hh(q + ivec2(1, 0), s), c = hh(q + ivec2(0, 1), s), d = hh(q + ivec2(1, 1), s);
	vec2 u = f * f * (3. - 2. * f), du = 6. * f * (1. - f);
	float e = a - b - c + d;
	return vec3(a + (b - a) * u.x + (c - a) * u.y + e * u.x * u.y, du * vec2(b - a + e * u.y, c - a + e * u.x));
}
float bmp(float x, float la, float lb, out float dp) {
	bool lee = x < (la + lb) * 0.5;
	float k = lee ? 1. / la : 1. / (1. - lb);
	float s = lee ? x * k : (x - 1.) * k;
	float q = max(1. - s * s, 0.);
	dp = -4. * s * q * k;
	return q * q;
}
float msk(float x) {
	return smoothstep(LA1 * 0.7, LA1 * 1.05, x) * (1. - smoothstep(0.88, 0.98, x));
}
float ter(vec2 p, out vec4 g0, out vec4 g1, out vec4 g2, out vec4 g3) {
	vec3 a = vnd(p * F1 + vec2(3.7, 1.3), 1u), b = vnd(p * F2 + vec2(5.1, 8.9), 2u), c = vnd(p * F3 + vec2(6.3, 2.4), 3u), h = vnd(p * F4 + vec2(0.6, 4.8), 14u);
	float p1 = (dot(p, w1) + AW1 * (a.x - 0.5) + AW2 * (b.x - 0.5) + AW4 * (h.x - 0.5)) / L1;
	float p2 = (dot(p, w2) + AW3 * (c.x - 0.5)) / L2;
	vec3 e = vnd(vec2(dot(p, c1) * FAC + 2.2, dot(p, w1) * FAW + 6.6), 4u), f = vnd(p * FA2 + vec2(8.1, 0.9), 5u);
	float s1 = clamp((e.x - 0.15) / 0.6, 0., 1.), s2 = clamp((f.x - 0.25) / 0.45, 0., 1.);
	float A1 = s1 * s1 * (3. - 2. * s1), A2 = s2 * s2 * (3. - 2. * s2);
	vec2 ga = 10. * s1 * (1. - s1) * (e.y * FAC * c1 + e.z * FAW * w1);
	vec3 d1 = vnd(p * FD + vec2(4.4, 0.7), 6u), d2 = vnd(p * FD * 2.3 + vec2(9.1, 3.3), 7u), m1 = vnd(p * FM + vec2(1.9, 7.3), 12u);
	float gu = dot(p, w1), gv = dot(p, c1) / GV, gk = gu > 0. ? 1. / GU : 1. / GS, su = gu * gk;
	float bq = max(1. - su * su, 0.), cq = max(1. - gv * gv, 0.), B = bq * bq, C = cq * cq;
	vec2 gb = -4. * su * bq * gk * C * w1 - 4. * gv * cq / GV * B * c1;
	float kt = clamp((B * C - 0.2) / 0.55, 0., 1.), K = 1. - 0.9 * kt * kt * (3. - 2. * kt);
	vec2 gK = -9.8181818 * kt * (1. - kt) * gb;
	float x1 = fract(p1), dp;
	g0 = vec4(p1, (w1 + AW1 * F1 * a.yz + AW2 * F2 * b.yz + AW4 * F4 * h.yz) / L1, A1 * K);
	g1 = vec4(p2, (w2 + AW3 * F3 * c.yz) / L2, A2);
	g2 = vec4(ga * K + A1 * gK, 13.333333 * s2 * (1. - s2) * FA2 * f.yz);
	g3 = vec4(HD * FD * (d1.yz + 1.035 * d2.yz) + HM * FM * m1.yz + GH * gb, B * C, 0.);
	return HD * (d1.x + 0.45 * d2.x - 0.72) + HM * (m1.x - 0.5) + GH * B * C + H1 * A1 * K * bmp(x1, LA1, LB1, dp) + H2 * A2 * msk(x1) * bmp(fract(p2), LA2, LB2, dp);
}
`

export function make(rd, seed) {
	const mob = !!rd.mob
	const R = rng(seed)
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 4000)
	const sg = R() < 0.5 ? -1 : 1
	const gm = (0.96 + R() * 0.52) * sg
	const a1 = gm - sg * Math.PI / 2, a2 = a1 + (R() < 0.5 ? -1 : 1) * (0.25 + R() * 0.35)
	const w1 = new THREE.Vector2(Math.sin(a1), -Math.cos(a1)), w2 = new THREE.Vector2(Math.sin(a2), -Math.cos(a2))
	const cr = new THREE.Vector2(-w1.y, w1.x)
	const sa0 = (R() < 0.5 ? -1 : 1) * (1.22 + R() * 0.7)
	const se = 0.38 + R() * 0.12
	const q1 = 0.15 + R() * 0.035, q2 = 0.08 + R() * 0.03
	const l1 = 190 + R() * 80, h1 = l1 * q1
	const l2 = l1 * (0.2 + R() * 0.06), h2 = l2 * q2
	const k = {
		sdv: Math.floor(R() * 1e9), w1, w2, l1, h1, la1: 2.2 * q1, lb1: 1 - 3.08 * q1, l2, h2, la2: 2.2 * q2, lb2: 1 - 3.08 * q2,
		aw1: l1 * 0.3, f1: 1 / (l1 * 1.5), aw2: l1 * 0.12, f2: 1 / (l1 * 0.45), aw3: l2 * 0.3, f3: 1 / (l2 * 1.8), aw4: l1 * 0.02, f4: 1 / (l1 * 0.14),
		fac: 1 / (l1 * 1.1), faw: 1 / (l1 * 2.2), fa2: 1 / (l2 * 4), hd: 10 + R() * 6, fd: 1 / (800 + R() * 200), hm: 16 + R() * 8, fm: 1 / (1400 + R() * 300),
		gh: 150 + R() * 40, gu: 330 + R() * 80, gs: 560 + R() * 120, gv: 800 + R() * 250
	}
	k.hmx = k.hd * 0.73 + k.hm * 0.5 + k.gh + h1 + h2 + 1

	const hh = (x, y, s) => {
		let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + k.sdv + Math.imul(s, -2048144777) | 0
		h = Math.imul(h ^ h >>> 13, 1274126177)
		return ((h ^ h >>> 16) >>> 0) / 4294967296
	}
	const vn = (x, y, s) => {
		const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi
		const a = hh(xi, yi, s), b = hh(xi + 1, yi, s), c = hh(xi, yi + 1, s), d = hh(xi + 1, yi + 1, s)
		const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
		return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
	}
	const bmp = (x, la, lb) => {
		const s = x < (la + lb) * 0.5 ? x / la : (x - 1) / (1 - lb)
		const q = Math.max(1 - s * s, 0)
		return q * q
	}
	const cl = v => Math.min(Math.max(v, 0), 1)
	const ter = (x, z) => {
		const a = vn(x * k.f1 + 3.7, z * k.f1 + 1.3, 1), b = vn(x * k.f2 + 5.1, z * k.f2 + 8.9, 2), c = vn(x * k.f3 + 6.3, z * k.f3 + 2.4, 3), g = vn(x * k.f4 + 0.6, z * k.f4 + 4.8, 14)
		const p1 = (x * w1.x + z * w1.y + k.aw1 * (a - 0.5) + k.aw2 * (b - 0.5) + k.aw4 * (g - 0.5)) / l1
		const p2 = (x * w2.x + z * w2.y + k.aw3 * (c - 0.5)) / l2
		const s1 = cl((vn((z * w1.x - x * w1.y) * k.fac + 2.2, (x * w1.x + z * w1.y) * k.faw + 6.6, 4) - 0.15) / 0.6), s2 = cl((vn(x * k.fa2 + 8.1, z * k.fa2 + 0.9, 5) - 0.25) / 0.45)
		const A1 = s1 * s1 * (3 - 2 * s1), A2 = s2 * s2 * (3 - 2 * s2)
		const x1 = p1 - Math.floor(p1), x2 = p2 - Math.floor(p2)
		const M = sst(k.la1 * 0.7, k.la1 * 1.05, x1) * (1 - sst(0.88, 0.98, x1))
		const D = k.hd * (vn(x * k.fd + 4.4, z * k.fd + 0.7, 6) + 0.45 * vn(x * k.fd * 2.3 + 9.1, z * k.fd * 2.3 + 3.3, 7) - 0.72) + k.hm * (vn(x * k.fm + 1.9, z * k.fm + 7.3, 12) - 0.5)
		const gu = x * w1.x + z * w1.y, gv = (z * w1.x - x * w1.y) / k.gv, su = gu / (gu > 0 ? k.gu : k.gs)
		const bq = Math.max(1 - su * su, 0), cq = Math.max(1 - gv * gv, 0), G = bq * bq * cq * cq
		const K = 1 - 0.9 * sst(0.2, 0.75, G)
		return { h: D + k.gh * G + h1 * A1 * K * bmp(x1, k.la1, k.lb1) + h2 * A2 * M * bmp(x2, k.la2, k.lb2), p1, A1: A1 * K }
	}
	const crs = (x, z) => {
		for (let i = 0; i < 6; i++) {
			const d = ter(x, z).p1
			const e = d - Math.round(d)
			x -= e * l1 * w1.x
			z -= e * l1 * w1.y
		}
		return [x, z]
	}

	const cx = w1.x * 0.3 * k.gu, cz = w1.y * 0.3 * k.gu
	const cam0 = new THREE.Vector3(cx, ter(cx, cz).h + 1.7, cz)

	const nr = mob ? 360 : 560, nt = mob ? 1024 : 2048, nh = mob ? 700 : 1400
	k.cx = cx
	k.cz = cz
	k.r0 = 0.3
	k.lnr = Math.log(3000 / k.r0)
	const tg = tgl(k)
	const dg = dgl(R() * Math.PI)

	const hrt = new THREE.WebGLRenderTarget(nt, nh, {
		type: THREE.HalfFloatType, format: THREE.RedFormat, depthBuffer: false, generateMipmaps: false,
		minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping
	})
	{
		const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
			depthTest: false,
			depthWrite: false,
			vertexShader: `varying vec2 vu;
void main() {
	vu = uv;
	gl_Position = vec4(position.xy, 0., 1.);
}`,
			fragmentShader: `${tg}
varying vec2 vu;
void main() {
	float a = (vu.x - 0.5) * 6.2831853, r = R0 * exp(vu.y * LNR);
	vec4 g0, g1, g2, g3;
	gl_FragColor = vec4(ter(co + r * vec2(cos(a), sin(a)), g0, g1, g2, g3), 0., 0., 1.);
}`
		}))
		const oc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
		const prv = rd.getRenderTarget()
		rd.setRenderTarget(hrt)
		rd.render(q, oc)
		rd.setRenderTarget(prv)
		q.geometry.dispose()
		q.material.dispose()
	}

	const u = {
		ut: { value: 0 }, wh: { value: 1 }, sn: { value: new THREE.Vector3(0, 1, 0) },
		htx: { value: hrt.texture }, pr: { value: 1 }
	}

	const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), new THREE.ShaderMaterial({
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
${dg}
varying vec3 vd;
void main() {
	float t = sky(normalize(vd));
	gl_FragColor = vec4(dsp(dch(mix(t, 4., wh))), 1.);
}`
	}))
	sky.renderOrder = -1
	scene.add(sky)

	{
		const j0 = Math.floor((0.25 - 1.25 / (Math.PI * 2)) * nt), j1 = Math.ceil((0.25 + 1.25 / (Math.PI * 2)) * nt)
		const mj = j1 - j0 + 1
		const P = new Float32Array(nr * mj * 3), I = new Uint32Array((nr - 1) * (mj - 1) * 6)
		let n = 0
		for (let i = 0; i < nr; i++) {
			const r = k.r0 * Math.exp((i + 0.5) / nr * k.lnr)
			for (let j = j0; j <= j1; j++) {
				const a = (j + 0.5) / nt * Math.PI * 2 - Math.PI
				const o = (i * mj + j - j0) * 3
				P[o] = cx + Math.cos(a) * r
				P[o + 2] = cz + Math.sin(a) * r
			}
			if (i) {
				const o = (i - 1) * mj
				for (let j = 0; j < mj - 1; j++) {
					I[n++] = o + j
					I[n++] = o + j + 1
					I[n++] = o + mj + j + 1
					I[n++] = o + j
					I[n++] = o + mj + j + 1
					I[n++] = o + mj + j
				}
			}
		}
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.BufferAttribute(P, 3))
		g.setIndex(new THREE.BufferAttribute(I, 1))
		const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
			uniforms: u,
			vertexShader: `${tg}
varying vec3 vw;
varying vec4 v0, v1, v2, v3;
void main() {
	vec2 p = position.xz;
	float h = ter(p, v0, v1, v2, v3);
	vw = vec3(p.x, h, p.y);
	gl_Position = projectionMatrix * viewMatrix * vec4(vw, 1.);
}`,
			fragmentShader: `${glsl}
${nois}
${dg}
${tg}
uniform sampler2D htx;
varying vec3 vw;
varying vec4 v0, v1, v2, v3;
float hat(vec2 p) {
	vec2 d = p - co;
	float v = log(max(length(d), R0) / R0) / LNR;
	if (v > 1.) return -1e3;
	return texture2D(htx, vec2(atan(d.y, d.x + 1e-6) / 6.2831853 + 0.5, v)).r;
}
float shd(vec3 p, vec3 n, float l) {
	vec3 o = p + n * (0.08 + l * 0.0015);
	float s = 0.4 + l * 0.005, sh = 1.;
	for (int i = 0; i < ${mob ? 14 : 20}; i++) {
		vec3 q = o + sn * s;
		sh = min(sh, clamp((q.y - hat(q.xz)) / (s * (0.025 + l * 0.00006)) + 0.5, 0., 1.));
		if (sh < 0.01 || q.y > HMX) break;
		s *= 1.3;
	}
	return sh;
}
float dss(float a, float b, float x) {
	float t = clamp((x - a) / (b - a), 0., 1.);
	return 6. * t * (1. - t) / (b - a);
}
void main() {
	vec3 V = vw - cameraPosition;
	float l = length(V);
	V /= l;
	float x1 = fract(v0.x), x2 = fract(v1.x), d1, d2;
	float P1 = bmp(x1, LA1, LB1, d1), P2 = bmp(x2, LA2, LB2, d2);
	float e1 = x1 < (LA1 + LB1) * 0.5 ? smoothstep(0.25, 0.45, x1 / LA1) * (1. - smoothstep(0.8, 0.95, x1 / LA1)) : 0.;
	float e2 = x2 < (LA2 + LB2) * 0.5 ? smoothstep(0.25, 0.45, x2 / LA2) * (1. - smoothstep(0.8, 0.95, x2 / LA2)) : 0.;
	float M = msk(x1);
	float dm = dss(LA1 * 0.7, LA1 * 1.05, x1) * (1. - smoothstep(0.88, 0.98, x1)) - smoothstep(LA1 * 0.7, LA1 * 1.05, x1) * dss(0.88, 0.98, x1);
	vec2 g = v3.xy + H1 * (v2.xy * P1 + v0.w * d1 * v0.yz) + H2 * (M * (v2.zw * P2 + v1.w * d2 * v1.yz) + v1.w * P2 * dm * v0.yz);
	vec3 r1 = vnd(vw.xz * 0.33 + vec2(1.3, 7.1), 8u), r2 = vnd(vw.xz * 0.09 + vec2(7.7, 2.9), 9u), r3 = vnd(vw.xz * 0.045 + vec2(0.4, 5.2), 10u);
	vec3 r4 = vnd(vw.xz * 1.3 + vec2(5.5, 3.3), 13u);
	float rs = v1.x * (L2 / 0.28) + 0.9 * r1.x + 0.5 * r4.x;
	vec2 gs = v1.yz * (L2 / 0.28) + 0.297 * r1.yz + 0.65 * r4.yz;
	float fw = fwidth(rs);
	float a1 = 6.2831853 * rs, a2 = 6.2831853 * (rs * 1.17 + 0.3);
	float dr = mix(cos(a1 + 0.5 * sin(a1)) * (1. + 0.5 * cos(a1)), cos(a2 + 0.5 * sin(a2)) * (1. + 0.5 * cos(a2)) * 1.17, smoothstep(0.35, 0.65, r2.x));
	float le = max(e1, e2 * M * v1.w);
	g += dr * gs * 0.022 * (1. - smoothstep(0.12, 0.3, fw)) * (1. - le) * (0.2 + 0.8 * smoothstep(0.3, 0.7, r3.x)) * smoothstep(0.3, 0.7, r4.x + 0.3 * r1.x);
	vec2 c1 = vec2(-w1.y, w1.x);
	vec3 gf = vnd(vec2(dot(vw.xz, c1) / 1.1, dot(vw.xz, w1) / 7.), 11u);
	g += (gf.y * c1 / 1.1 + gf.z * w1 / 7.) * 0.1 * e1 * (1. - smoothstep(0.3, 0.8, fwidth(dot(vw.xz, c1) / 1.1)));
	float fx = max(length(fwidth(vw.xz)), 1e-4), lv = log2(fx), lf = floor(lv), lt = lv - lf;
	ivec2 k0 = ivec2(floor(vw.xz / exp2(lf))), k1 = ivec2(floor(vw.xz / exp2(lf + 1.)));
	float gw = 1. - 0.9 * smoothstep(15., 120., l);
	g += (vec2(mix(hh(k0, 17u), hh(k1, 18u), lt), mix(hh(k0, 19u), hh(k1, 20u), lt)) - 0.5) * 0.14 * gw;
	vec3 n = normalize(vec3(-g.x, 1., -g.y));
	float nl = dot(n, sn);
	float lit = nl > 0. ? nl * mix(shd(vw, n, l), 1., smoothstep(600., 1400., l)) : 0.;
	float q = smoothstep(0., 0.26, lit);
	float t = mix(1.9 + 0.25 * n.y, 2.92 + 0.98 * smoothstep(0.35, 0.8, lit), q) + (r3.x - 0.5) * 0.12;
	t = mix(t, mix(1., 1.45, q) + 0.12 * (r2.x - 0.5) + 0.08 * (r3.x - 0.5), (1. - smoothstep(0.01, 0.1, v0.w * P1)) * (1. - smoothstep(0.03, 0.25, v3.z)) * 0.92 * (1. - 0.6 * smoothstep(300., 1500., l)));
	float fp = fwidth(v0.x);
	t = mix(t, 3.95, smoothstep(0.8, 1., P1) * smoothstep(0.5, 0.9, v0.w) * q * 0.5);
	t += (mix(hh(k0, 15u), hh(k1, 16u), lt) - 0.5) * 0.08 * gw;
	t = mix(t, 3.97, step(0.998, hh(k0, 21u)) * q * (1. - smoothstep(5., 15., l)) * 0.5);
	t = mix(t, clamp(t, 2.3, 3.5), smoothstep(0.25, 0.7, fp));
	t = mix(max(t, 1.), hzt(V), 1. - exp(-l / 3200.));
	gl_FragColor = vec4(dsp(dch(mix(t, 4., wh))), 1.);
}`
		}))
		m.frustumCulled = false
		scene.add(m)
	}

	{
		const na = mob ? 70 : 140, per = mob ? 12 : 18
		const anc = []
		for (let i = 0; i < 4000 && anc.length < na; i++) {
			const r = 30 + Math.pow(R(), 1.2) * 150, a = -Math.PI / 2 + (R() - 0.5) * 2
			const [x, z] = crs(cx + Math.cos(a) * r, cz + Math.sin(a) * r)
			const q = ter(x, z)
			if (q.A1 > 0.6) anc.push([x, q.h, z])
		}
		const np = anc.length * per
		const pa = new Float32Array(np * 4), pb = new Float32Array(np * 4)
		for (let i = 0; i < np; i++) {
			const q = anc[Math.floor(i / per)]
			const o = (R() - 0.5) * 10
			pa.set([q[0] + o * cr.x, q[1] + 0.1, q[2] + o * cr.y, R() * 10], i * 4)
			pb.set([1 + R() * 1.2, 1.5 + R() * 1.5, R(), R()], i * 4)
		}
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(np * 3), 3))
		g.setAttribute('pa', new THREE.Float32BufferAttribute(pa, 4))
		g.setAttribute('pb', new THREE.Float32BufferAttribute(pb, 4))
		const m = new THREE.Points(g, new THREE.ShaderMaterial({
			uniforms: u,
			transparent: true,
			depthWrite: false,
			vertexShader: `uniform float ut, wh;
const vec2 wd = vec2(${fl(w1.x)}, ${fl(w1.y)});
attribute vec4 pa, pb;
uniform float pr;
varying float va, vt;
void main() {
	float tau = mod(ut + pa.w, pb.x);
	float e = tau / pb.x;
	vec3 p = pa.xyz + vec3(wd.x, 0., wd.y) * pb.y * tau + vec3(0., 0.5 * e * (1. - 0.6 * e) + (pb.z - 0.5) * 0.25 * e, 0.);
	p.xz += vec2(-wd.y, wd.x) * sin(tau * 3. + pb.w * 6.283) * 0.3 * e;
	vec4 mv = viewMatrix * vec4(p, 1.);
	gl_Position = projectionMatrix * mv;
	float d = -mv.z;
	float s = (0.03 + 0.04 * pb.z) * pr * 800. / max(d, 1.);
	gl_PointSize = clamp(s, 1.3 * pr, 6. * pr);
	va = pow(1. - e, 1.2) * smoothstep(0., 0.1, e) * 0.3 * min(s / (1.3 * pr), 1.) * (1. - smoothstep(110., 180., d)) * smoothstep(1.5, 6., d);
	vt = mix(3.55 + 0.4 * pb.w, 4., wh);
}`,
			fragmentShader: `${glsl}
${nois}
${dg}
varying float va, vt;
void main() {
	vec2 q = gl_PointCoord * 2. - 1.;
	float r = dot(q, q);
	if (r > 1. || va < 0.002) discard;
	gl_FragColor = vec4(dsp(dch(vt)), va * exp(-r * 3.) * (1. - r));
}`
		}))
		m.frustumCulled = false
		scene.add(m)
	}

	const ti = 3.6
	const look = new THREE.Vector3(), tmp = new THREE.Vector3()
	let it = -1, lx = 0, ly = 0, sa = sa0

	function vfov() {
		const a = camera.aspect
		return a < 1 ? Math.min(2 * Math.atan(Math.tan(25 * Math.PI / 180) / a) * 180 / Math.PI, 85) : 50
	}

	function update(dt, t, inp) {
		if (it < 0) it = inp.rm ? ti + 1 : 0
		it += dt
		u.ut.value += dt
		const fv = vfov()
		if (camera.fov !== fv) {
			camera.fov = fv
			camera.updateProjectionMatrix()
		}
		u.wh.value = 1 - sst(0.1, 3.4, it)
		sa += (sa0 + inp.mx * 0.45 - sa) * (1 - Math.exp(-dt * 0.8))
		u.sn.value.set(Math.sin(sa) * Math.cos(se), Math.sin(se), -Math.cos(sa) * Math.cos(se))
		u.pr.value = rd.getPixelRatio()
		lx += (inp.mx * 0.12 - lx) * (1 - Math.exp(-dt * 4))
		ly += (inp.my * 0.05 - ly) * (1 - Math.exp(-dt * 4))
		const yw = lx + (camera.aspect < 1 ? (w1.x < 0 ? -1 : 1) * 0.32 * (1 - camera.aspect) : 0)
		camera.position.copy(cam0)
		look.set(cam0.x + Math.sin(yw) * 10, cam0.y - 2.1 + ly * 10, cam0.z - Math.cos(yw) * 10)
		camera.lookAt(look)
		camera.updateMatrixWorld()
		sky.position.copy(camera.position)
		tmp.set(cam0.x + Math.sin(yw) * 1000, cam0.y, cam0.z - Math.cos(yw) * 1000).project(camera)
		return { busy: it < ti, bk: 0.25, haze: { y: tmp.y, a: sst(2, 4, it) } }
	}

	function pick() {
		return null
	}

	function dispose() {
		scene.traverse(q => {
			if (q.geometry) q.geometry.dispose()
			if (q.material) q.material.dispose()
		})
		hrt.dispose()
	}

	return { scene, camera, update, pick, dispose }
}
