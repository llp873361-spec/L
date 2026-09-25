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
const vec2 w1 = vec2(${fl(k.w1.x)}, ${fl(k.w1.y)}), w2 = vec2(${fl(k.w2.x)}, ${fl(k.w2.y)});
const vec2 co = vec2(${fl(k.cx)}, ${fl(k.cz)});
const float L1 = ${fl(k.l1)}, H1 = ${fl(k.h1)}, LA1 = ${fl(k.la1)}, LB1 = ${fl(k.lb1)};
const float L2 = ${fl(k.l2)}, H2 = ${fl(k.h2)}, LA2 = ${fl(k.la2)}, LB2 = ${fl(k.lb2)}, TR = ${fl(k.tr)};
const float AW1 = ${fl(k.aw1)}, F1 = ${fl(k.f1)}, AW2 = ${fl(k.aw2)}, F2 = ${fl(k.f2)}, AW3 = ${fl(k.aw3)}, F3 = ${fl(k.f3)}, AW4 = ${fl(k.aw4)}, F4 = ${fl(k.f4)};
const float FA1 = ${fl(k.fa1)}, FA2 = ${fl(k.fa2)}, HD = ${fl(k.hd)}, FD = ${fl(k.fd)}, HM = ${fl(k.hm)}, FM = ${fl(k.fm)};
const float R0 = ${fl(k.r0)}, LNR = ${fl(k.lnr)}, RK = ${fl(k.rk)}, HMX = ${fl(k.hmx)};
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
float prf(float x, float la, float lb, float ro) {
	float yl = 1. - x / la;
	float hl = (yl > TR ? yl - TR * 0.5 : yl > 0. ? yl * yl / (2. * TR) : 0.) / (1. - TR * 0.5);
	float t = max((x - lb) / (1. - lb), 0.);
	float p = max(hl, t * t * (2. - t));
	if (ro > 0.) {
		float d = x < 0.5 ? x : x - 1.;
		float m = max(ro - abs(d), 0.);
		p -= (1. / (1. - lb) + 1. / (la * (1. - TR * 0.5))) * m * m / (4. * ro);
	}
	return p;
}
float msk(float x) {
	return smoothstep(LA1 + 0.02, LA1 + 0.14, x) * (1. - smoothstep(0.9, 0.985, x));
}
float ter(vec2 p, float ro, out vec4 g0, out vec4 g1, out vec4 g2, out vec4 g3) {
	vec3 a = vnd(p * F1 + vec2(3.7, 1.3), 1u), b = vnd(p * F2 + vec2(5.1, 8.9), 2u), c = vnd(p * F3 + vec2(6.3, 2.4), 3u), h = vnd(p * F4 + vec2(0.6, 4.8), 14u);
	float p1 = (dot(p, w1) + AW1 * (a.x - 0.5) + AW2 * (b.x - 0.5) + AW4 * (h.x - 0.5)) / L1;
	float p2 = (dot(p, w2) + AW3 * (c.x - 0.5)) / L2;
	vec3 e = vnd(p * FA1 + vec2(2.2, 6.6), 4u), f = vnd(p * FA2 + vec2(8.1, 0.9), 5u);
	float s1 = clamp((e.x - 0.12) / 0.5, 0., 1.), s2 = clamp((f.x - 0.25) / 0.45, 0., 1.);
	float A1 = s1 * s1 * (3. - 2. * s1), A2 = s2 * s2 * (3. - 2. * s2);
	vec3 d1 = vnd(p * FD + vec2(4.4, 0.7), 6u), d2 = vnd(p * FD * 2.3 + vec2(9.1, 3.3), 7u), m1 = vnd(p * FM + vec2(1.9, 7.3), 12u);
	float x1 = fract(p1);
	g0 = vec4(p1, (w1 + AW1 * F1 * a.yz + AW2 * F2 * b.yz + AW4 * F4 * h.yz) / L1, A1);
	g1 = vec4(p2, (w2 + AW3 * F3 * c.yz) / L2, A2);
	g2 = vec4(12. * s1 * (1. - s1) * FA1 * e.yz, 13.333333 * s2 * (1. - s2) * FA2 * f.yz);
	g3 = vec4(HD * FD * (d1.yz + 1.035 * d2.yz) + HM * FM * m1.yz, 0., 0.);
	return HD * (d1.x + 0.45 * d2.x - 0.72) + HM * (m1.x - 0.5) + H1 * A1 * prf(x1, LA1, LB1, ro / L1) + H2 * A2 * msk(x1) * prf(fract(p2), LA2, LB2, ro / L2);
}
`

export function make(rd, seed) {
	const mob = !!rd.mob
	const R = rng(seed)
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 4000)
	const sg = R() < 0.5 ? -1 : 1
	const gm = (0.14 + R() * 0.64) * sg
	const a1 = gm - sg * Math.PI / 2, a2 = a1 + (R() < 0.5 ? -1 : 1) * (0.25 + R() * 0.35)
	const w1 = new THREE.Vector2(Math.sin(a1), -Math.cos(a1)), w2 = new THREE.Vector2(Math.sin(a2), -Math.cos(a2))
	const cr = new THREE.Vector2(-w1.y, w1.x)
	const sa0 = gm + sg * (Math.PI / 2 + R() * 0.8 - 0.3)
	const se = 0.38 + R() * 0.12
	const l1 = 180 + R() * 80, h1 = l1 * (0.08 + R() * 0.025)
	const l2 = l1 * (0.2 + R() * 0.06), h2 = l2 * (0.07 + R() * 0.03)
	const k = {
		sdv: Math.floor(R() * 1e9), w1, w2, l1, h1, la1: h1 / (0.63 * l1), l2, h2, la2: h2 / (0.6 * l2), tr: 0.12,
		aw1: l1 * 0.3, f1: 1 / (l1 * 1.5), aw2: l1 * 0.12, f2: 1 / (l1 * 0.45), aw3: l2 * 0.3, f3: 1 / (l2 * 1.8), aw4: l1 * 0.02, f4: 1 / (l1 * 0.14),
		fa1: 1 / (l1 * 3), fa2: 1 / (l2 * 4), hd: 10 + R() * 6, fd: 1 / (800 + R() * 200), hm: 55 + R() * 20, fm: 1 / (1400 + R() * 300)
	}
	k.lb1 = k.la1 + 0.08 + R() * 0.08
	k.lb2 = k.la2 + 0.1
	k.hmx = k.hd * 0.73 + k.hm * 0.5 + h1 + h2 + 1

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
	const prf = (x, la, lb) => {
		const yl = 1 - x / la
		const hl = (yl > k.tr ? yl - k.tr * 0.5 : yl > 0 ? yl * yl / (2 * k.tr) : 0) / (1 - k.tr * 0.5)
		const t = Math.max((x - lb) / (1 - lb), 0)
		return Math.max(hl, t * t * (2 - t))
	}
	const cl = v => Math.min(Math.max(v, 0), 1)
	const ter = (x, z) => {
		const a = vn(x * k.f1 + 3.7, z * k.f1 + 1.3, 1), b = vn(x * k.f2 + 5.1, z * k.f2 + 8.9, 2), c = vn(x * k.f3 + 6.3, z * k.f3 + 2.4, 3), g = vn(x * k.f4 + 0.6, z * k.f4 + 4.8, 14)
		const p1 = (x * w1.x + z * w1.y + k.aw1 * (a - 0.5) + k.aw2 * (b - 0.5) + k.aw4 * (g - 0.5)) / l1
		const p2 = (x * w2.x + z * w2.y + k.aw3 * (c - 0.5)) / l2
		const s1 = cl((vn(x * k.fa1 + 2.2, z * k.fa1 + 6.6, 4) - 0.12) / 0.5), s2 = cl((vn(x * k.fa2 + 8.1, z * k.fa2 + 0.9, 5) - 0.25) / 0.45)
		const A1 = s1 * s1 * (3 - 2 * s1), A2 = s2 * s2 * (3 - 2 * s2)
		const x1 = p1 - Math.floor(p1), x2 = p2 - Math.floor(p2)
		const M = sst(k.la1 + 0.02, k.la1 + 0.14, x1) * (1 - sst(0.9, 0.985, x1))
		const D = k.hd * (vn(x * k.fd + 4.4, z * k.fd + 0.7, 6) + 0.45 * vn(x * k.fd * 2.3 + 9.1, z * k.fd * 2.3 + 3.3, 7) - 0.72) + k.hm * (vn(x * k.fm + 1.9, z * k.fm + 7.3, 12) - 0.5)
		return { h: D + h1 * A1 * prf(x1, k.la1, k.lb1) + h2 * A2 * M * prf(x2, k.la2, k.lb2), p1, A1 }
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

	let mx0 = 0, mz0 = 0, mv = -1
	for (let i = -15; i <= 15; i++) {
		for (let j = -15; j <= 15; j++) {
			const v = vn(i * 60 * k.fm + 1.9, j * 60 * k.fm + 7.3, 12)
			if (v > mv) {
				mv = v
				mx0 = i * 60
				mz0 = j * 60
			}
		}
	}
	let bx = 0, bz = 0, bh = -1e9
	for (let i = 0; i < 200; i++) {
		const [x, z] = crs(mx0 + (R() - 0.5) * 300, mz0 + (R() - 0.5) * 300)
		const h = ter(x, z).h
		if (h > bh) {
			bh = h
			bx = x
			bz = z
		}
	}
	const cx = bx - w1.x * 1.5, cz = bz - w1.y * 1.5
	const cam0 = new THREE.Vector3(cx, ter(cx, cz).h + 1.7, cz)

	const nr = mob ? 360 : 560, nt = mob ? 1024 : 2048, nh = mob ? 700 : 1400
	k.cx = cx
	k.cz = cz
	k.r0 = 0.3
	k.lnr = Math.log(3000 / k.r0)
	k.rk = 0.6 * (Math.exp(k.lnr / nr) - 1)
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
	gl_FragColor = vec4(ter(co + r * vec2(cos(a), sin(a)), RK * r, g0, g1, g2, g3), 0., 0., 1.);
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
	float h = ter(p, RK * length(p - co), v0, v1, v2, v3);
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
float prd(float x, float la, float lb, out float dp, out float le) {
	float yl = 1. - x / la, kn = 1. / (1. - TR * 0.5);
	float hl = (yl > TR ? yl - TR * 0.5 : yl > 0. ? yl * yl / (2. * TR) : 0.) * kn;
	float t = max((x - lb) / (1. - lb), 0.);
	float hs = t * t * (2. - t);
	if (hl > hs) {
		dp = -(yl > TR ? 1. : max(yl, 0.) / TR) * kn / la;
		le = smoothstep(0., TR, yl);
		return hl;
	}
	dp = t * (4. - 3. * t) / (1. - lb);
	le = 0.;
	return hs;
}
float dss(float a, float b, float x) {
	float t = clamp((x - a) / (b - a), 0., 1.);
	return 6. * t * (1. - t) / (b - a);
}
void main() {
	vec3 V = vw - cameraPosition;
	float l = length(V);
	V /= l;
	float x1 = fract(v0.x), x2 = fract(v1.x), d1, d2, e1, e2;
	float P1 = prd(x1, LA1, LB1, d1, e1), P2 = prd(x2, LA2, LB2, d2, e2);
	float M = msk(x1);
	float dm = dss(LA1 + 0.02, LA1 + 0.14, x1) * (1. - smoothstep(0.9, 0.985, x1)) - smoothstep(LA1 + 0.02, LA1 + 0.14, x1) * dss(0.9, 0.985, x1);
	vec2 g = v3.xy + H1 * (v2.xy * P1 + v0.w * d1 * v0.yz) + H2 * (M * (v2.zw * P2 + v1.w * d2 * v1.yz) + v1.w * P2 * dm * v0.yz);
	vec3 r1 = vnd(vw.xz * 0.33 + vec2(1.3, 7.1), 8u), r2 = vnd(vw.xz * 0.09 + vec2(7.7, 2.9), 9u), r3 = vnd(vw.xz * 0.045 + vec2(0.4, 5.2), 10u);
	vec3 r4 = vnd(vw.xz * 1.3 + vec2(5.5, 3.3), 13u);
	float rs = v1.x * (L2 / 0.28) + 0.9 * r1.x + 0.5 * r4.x;
	vec2 gs = v1.yz * (L2 / 0.28) + 0.297 * r1.yz + 0.65 * r4.yz;
	float fw = fwidth(rs);
	float a1 = 6.2831853 * rs, a2 = 6.2831853 * (rs * 1.17 + 0.3);
	float dr = mix(cos(a1 + 0.5 * sin(a1)) * (1. + 0.5 * cos(a1)), cos(a2 + 0.5 * sin(a2)) * (1. + 0.5 * cos(a2)) * 1.17, smoothstep(0.35, 0.65, r2.x));
	float bd = min(x1 > 0.5 ? (1. - x1) * L1 : 99., x2 > 0.5 ? (1. - x2) * L2 : 99.);
	float le = max(e1, e2 * M * v1.w);
	g += dr * gs * 0.022 * (1. - smoothstep(0.12, 0.3, fw)) * (1. - le) * smoothstep(0.3, 1.6, bd) * (0.2 + 0.8 * smoothstep(0.3, 0.7, r3.x)) * smoothstep(0.3, 0.7, r4.x + 0.3 * r1.x);
	vec2 c1 = vec2(-w1.y, w1.x);
	vec3 gf = vnd(vec2(dot(vw.xz, c1) / 1.1, dot(vw.xz, w1) / 7.), 11u);
	g += (gf.y * c1 / 1.1 + gf.z * w1 / 7.) * 0.1 * e1 * (1. - smoothstep(0.3, 0.8, fwidth(dot(vw.xz, c1) / 1.1)));
	vec3 n = normalize(vec3(-g.x, 1., -g.y));
	float nl = dot(n, sn);
	float lit = nl > 0. ? nl * mix(shd(vw, n, l), 1., smoothstep(600., 1400., l)) : 0.;
	float q = smoothstep(0., 0.26, lit);
	float t = mix(1.9 + 0.25 * n.y, 2.92 + 0.95 * smoothstep(0.45, 0.95, lit), q) + (r3.x - 0.5) * 0.12;
	t = mix(t, mix(0.75, 1.45, q) + 0.3 * (r2.x - 0.5) + 0.2 * (r3.x - 0.5), (1. - smoothstep(0.005, 0.05, v0.w * P1)) * 0.92 * (1. - 0.6 * smoothstep(300., 1500., l)));
	float fp = fwidth(v0.x);
	float dc = (x1 < 0.5 ? x1 : 1. - x1) * L1;
	t = mix(t, 3.97, exp(-dc / max(0.9, 1.5 * fp * L1)) * q * smoothstep(0.35, 0.7, v0.w) * 0.85);
	t = mix(t, clamp(t, 2.3, 3.5), smoothstep(0.25, 0.7, fp));
	t = mix(t, hzt(V), 1. - exp(-l / 3200.));
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
		lx += (-inp.mx * 0.05 - lx) * (1 - Math.exp(-dt * 2))
		ly += (inp.my * 0.03 - ly) * (1 - Math.exp(-dt * 2))
		const yw = lx + (camera.aspect < 1 ? (w1.x < 0 ? -1 : 1) * 0.32 * (1 - camera.aspect) : 0)
		camera.position.copy(cam0)
		look.set(cam0.x + Math.sin(yw) * 10, cam0.y - 1.6 + ly * 10, cam0.z - Math.cos(yw) * 10)
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
