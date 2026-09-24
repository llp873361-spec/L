import * as THREE from 'three'
import { glsl, nois } from './palette.js'

export const names = { city: '灯城', flower: '花潮', rain: '雨汀', desert: '沙昼', mirror: '镜夜' }
const kinds = ['city', 'flower', 'rain', 'desert', 'mirror']

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

const wgl = `
uniform float ut;
uniform vec4 bms[8];
const vec3 wc[5] = vec3[5](pk6, pk3, pk2, pk1, pk0);
float wtau(float y) {
	float d = max(-y, 0.);
	if (d < 7.) return d / 7.;
	if (d < 27.) return 1. + pow((d - 7.) / 20., 0.8);
	if (d < 62.) return 2. + (d - 27.) / 35.;
	return 3. + min((d - 62.) / 28., 1.);
}
vec3 wcp(float t, out vec3 a, out vec3 b) {
	t = clamp(t, 0., 4.);
	int i = int(min(floor(t), 3.));
	a = wc[i];
	b = wc[i + 1];
	return mix(a, b, t - float(i));
}
float warc(float t) {
	float s = 0.;
	for (int i = 0; i < 4; i++) s += distance(wc[i], wc[i + 1]) * clamp(t - float(i), 0., 1.);
	return s;
}
float wtoa(float s) {
	for (int i = 0; i < 4; i++) {
		float l = distance(wc[i], wc[i + 1]);
		if (s <= l) return float(i) + s / max(l, 1e-5);
		s -= l;
	}
	return 4.;
}
float sft(vec3 ro, vec3 rd, float tm) {
	vec3 ax = normalize(vec3(0.22, -1., 0.08));
	float s = 0.;
	for (int i = 0; i < 8; i++) {
		vec3 p0 = vec3(bms[i].x, 0., bms[i].y);
		vec3 w0 = ro - p0;
		float b = dot(rd, ax);
		float t = clamp((b * dot(ax, w0) - dot(rd, w0)) / max(1. - b * b, 1e-4), 0., tm);
		vec3 pr = ro + rd * t - p0;
		float u = max(dot(pr, ax), 0.);
		float dd = length(pr - ax * u);
		float w = bms[i].z * (1. + u * 0.012);
		s += exp(-dd * dd / (w * w)) * exp(-u / 50.) * (0.6 + 0.4 * sin(ut * 0.35 + bms[i].w * 6.28)) * smoothstep(1., 8., t);
	}
	return s;
}
float bgt(vec3 ro, vec3 rd, float tm, float ex) {
	float w = smoothstep(0.45, 0.97, rd.y) * exp(ro.y / 40.);
	float y = ro.y + rd.y * 46. + sft(ro, rd, tm) * 7. + w * 20. + ex;
	return wtau(-2. * log(1. + exp(-y / 2.)));
}
vec3 cwf(vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec4 st, float v, float k, float tg, float f, out vec3 a, out vec3 b) {
	float l1 = distance(c0, c1), l2 = distance(c1, c2), l3 = distance(c2, c3);
	float x = clamp(v, st.x, st.w);
	float sv = x < st.y ? l1 * (x - st.x) / (st.y - st.x) : x < st.z ? l1 + l2 * (x - st.y) / (st.z - st.y) : l1 + l2 + l3 * (x - st.z) / (st.w - st.z);
	float sk = k < 0.5 ? 0. : k < 1.5 ? l1 : k < 2.5 ? l1 + l2 : l1 + l2 + l3;
	vec3 ck = k < 0.5 ? c0 : k < 1.5 ? c1 : k < 2.5 ? c2 : c3;
	float m0 = abs(sv - sk), m1 = distance(ck, pk2);
	float w2 = warc(2.), wg = warc(tg);
	float s = clamp(f, 0., 1.) * (m0 + m1 + abs(wg - w2));
	if (s <= m0) {
		float r = sv + sign(sk - sv) * s;
		if (r < l1) {
			a = c0;
			b = c1;
			return mix(c0, c1, r / max(l1, 1e-5));
		}
		if (r < l1 + l2) {
			a = c1;
			b = c2;
			return mix(c1, c2, (r - l1) / max(l2, 1e-5));
		}
		a = c2;
		b = c3;
		return mix(c2, c3, min((r - l1 - l2) / max(l3, 1e-5), 1.));
	}
	s -= m0;
	if (s <= m1) {
		a = ck;
		b = pk2;
		return mix(ck, pk2, s / max(m1, 1e-5));
	}
	s -= m1;
	return wcp(wtoa(w2 + sign(wg - w2) * s), a, b);
}
float lif(float y) {
	return exp(min(y, 0.) / 38.);
}
float fgi(vec3 wp, out float tg) {
	vec3 d = wp - cameraPosition;
	float l = length(d);
	tg = bgt(cameraPosition, d / l, l, 0.);
	return 1. - exp(-pow(l / 72., 2.));
}
vec2 h22(vec2 p) {
	return vec2(hs(p), hs(p + 19.19));
}
float vor(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	float d1 = 8., d2 = 8.;
	for (int y = -1; y <= 1; y++) {
		for (int x = -1; x <= 1; x++) {
			vec2 g = vec2(float(x), float(y));
			vec2 o = 0.5 + 0.42 * sin(ut * 0.55 + 6.2831 * h22(i + g));
			float d = length(g + o - f);
			if (d < d1) {
				d2 = d1;
				d1 = d;
			} else if (d < d2) {
				d2 = d;
			}
		}
	}
	return d2 - d1;
}
float cau(vec3 wp) {
	vec2 p = wp.xz * 0.21 + wp.y * 0.04;
	float a = min(vor(p), vor(p * 1.37 + 4.1));
	return pow(1. - smoothstep(0., 0.16, a), 2.) * exp(wp.y / 22.);
}
float sdt(vec3 p, float sc, float sd, float pr, float r0, float r1, out vec3 id) {
	id = floor(p * sc);
	vec3 jt = vec3(hs(id + sd), hs(id + sd + 3.1), hs(id + sd + 7.7)) - 0.5;
	vec3 cp = normalize((id + 0.5 + jt * 0.6) / sc);
	float r = mix(r0, r1, hs(id + sd + 11.3));
	return step(hs(id * 1.7 + sd * 9.), pr) * (1. - smoothstep(r * 0.4, r, length(p - cp) * sc));
}
float fb3(vec3 p) {
	return (vn(p) * 0.5 + vn(p * 2.03 + 1.7) * 0.25 + vn(p * 4.1 + 3.3) * 0.125) / 0.875;
}
`

const svs = `
attribute vec4 am;
attribute vec4 ar;
attribute vec2 an;
uniform float ut, hov;
varying vec3 vw, vnr, vl, vce;
varying float vs, vh, vr;
vec3 rot(vec3 v, vec3 k, float a) {
	float c = cos(a), s = sin(a);
	return v * c + cross(k, v) * s + k * dot(k, v) * (1. - c);
}
void main() {
	vec3 c = instanceMatrix[3].xyz;
	float s = length(instanceMatrix[0].xyz);
	c += vec3(sin(ut * am.x + am.y) * 0.45, sin(ut * am.z + am.w) * 0.7, cos(ut * am.x * 0.8 + am.w) * 0.45);
	float a = ut * ar.w + an.x * 6.2831;
	vnr = rot(normal, ar.xyz, a);
	vl = position;
	vce = c;
	vw = c + rot(position, ar.xyz, a) * s;
	vs = an.x;
	vr = s;
	vh = 1. - step(0.5, abs(an.y - hov));
	gl_Position = projectionMatrix * viewMatrix * vec4(vw, 1.);
}`

const sfh = `${glsl}
${nois}
${wgl}
uniform float opq;
varying vec3 vw, vnr, vl, vce;
varying float vs, vh, vr;
float ff, fg;
vec4 fin(vec3 c, vec3 a, vec3 b, float al, vec3 N, vec3 V) {
	float nv = max(dot(N, V), 0.);
	twk(c, a, b, true, vh * pow(1. - nv, 2.2) * 0.9);
	return vec4(dsp(c), al);
}
float aaf(vec3 q) {
	return clamp(1.4 - length(fwidth(q)) * 1.6, 0., 1.);
}
`

const fsh = {
	city: `
void main() {
	vec3 N = normalize(vnr), V = normalize(cameraPosition - vw);
	vec3 p = normalize(vl);
	float lt = clamp(N.y * 0.5 + 0.5, 0., 1.);
	float dep = 1. - lif(vw.y);
	float den = smoothstep(0.38, 0.62, fb3(p * 2.2 + vs * 31.));
	vec3 id, i2;
	float aa = aaf(p * 17.);
	float dt = sdt(p, 17., vs, den * 1.05 + 0.05, 0.14, 0.28, id) * aa;
	dt = max(dt, sdt(p, 40., vs + 0.37, den * 0.95 + 0.04, 0.14, 0.3, i2) * aaf(p * 40.) * 0.85);
	float v = 0.42 + 0.18 * lt + den * mix(0.42, 0.26, aa) + cau(vw) * max(N.y, 0.) * 0.08 - dep * 0.1 + pow(1. - max(dot(N, V), 0.), 3.) * 0.3;
	vec3 a, b;
	ff = fgi(vw, fg);
	vec3 c = cwf(pk0, pk1, pk2, pk4, vec4(0., 0.3, 0.72, 1.), v, 2., fg, ff, a, b);
	dt *= 1. - ff;
	vec3 la = pk5, lb = pk6;
	float lh = 0.3 + 0.7 * hs(id + 5.5);
	if (hs(id + 8.8) > 0.93) {
		la = pk6;
		lb = pk7;
		lh = 0.6;
	}
	c = mix(c, mix(la, lb, lh), dt);
	if (dt > 0.5) {
		a = la;
		b = lb;
	}
	gl_FragColor = fin(c, a, b, 1., N, V);
}`,
	flower: `
void main() {
	vec3 N = normalize(vnr), V = normalize(cameraPosition - vw);
	vec3 p = normalize(vl);
	float nv = max(dot(N, V), 0.);
	float lt = clamp(N.y * 0.5 + 0.5, 0., 1.);
	float dep = 1. - lif(vw.y);
	float m = fb3(p * 3. + vs * 23.);
	vec3 id;
	float aa = aaf(p * 15.);
	float sp = sdt(p, 15., vs, 0.72, 0.16, 0.34, id);
	float fz = vn(p * 90. + ut * 0.3);
	float rim = clamp(pow(1. - nv, 1.6) * (0.65 + 0.7 * fz), 0., 1.);
	float v = 0.28 + 0.2 * lt + 0.12 * m - 0.12 * nv * nv - dep * 0.1 + sp * aa * 0.3 + (1. - aa) * 0.08 + rim * 0.62 + cau(vw) * max(N.y, 0.) * 0.06;
	vec3 a, b;
	ff = fgi(vw, fg);
	vec3 c = cwf(pk2, pk4, pk5, pk6, vec4(0., 0.35, 0.68, 1.), v, 0., fg, ff, a, b);
	gl_FragColor = fin(c, a, b, 1., N, V);
}`,
	rain: `
void main() {
	vec3 N = normalize(vnr), V = normalize(cameraPosition - vw);
	vec3 p = normalize(vl);
	float nv = max(dot(N, V), 0.);
	float lt = clamp(N.y * 0.5 + 0.5, 0., 1.);
	float dep = 1. - lif(vw.y);
	vec3 o = (vw - vce) / vr;
	float cl = 0.;
	for (int k = 1; k <= 3; k++) {
		vec3 s = o - V * (0.3 * float(k));
		cl += fb3(s * 1.7 + vec3(ut * 0.07, ut * 0.04, 0.) + vs * 13.) * (1.2 - 0.2 * float(k));
	}
	cl = smoothstep(0.6, 1.3, cl);
	vec3 id;
	float aa = aaf(p * 13.);
	float dp = sdt(p, 13., vs, 0.42, 0.12, 0.26, id) * aa;
	float hl = smoothstep(0.55, 1., dp);
	float fr = pow(1. - nv, 2.5);
	float v = 0.6 + 0.1 * lt + cl * 0.22 + fr * 0.14 - dep * 0.1 + dp * 0.08 + hl * 0.3 + cau(vw) * max(N.y, 0.) * 0.05;
	vec3 a, b;
	ff = fgi(vw, fg);
	vec3 c = cwf(pk1, pk2, pk3, pk6, vec4(0., 0.3, 0.72, 1.), v, 1., fg, ff, a, b);
	gl_FragColor = fin(c, a, b, max(mix(0.68, 0.96, fr), opq), N, V);
}`,
	desert: `
void main() {
	vec3 N = normalize(vnr), V = normalize(cameraPosition - vw);
	vec3 p = normalize(vl);
	float lt = clamp(N.y * 0.5 + 0.5, 0., 1.);
	float dep = 1. - lif(vw.y);
	float du = fb3(p * 2.6 + vs * 17.);
	float rg = 1. - abs(du * 2. - 1.);
	float q = (p.y * 3.2 + du * 1.8 + p.x * 0.6) * 26.;
	float aa = clamp(1.3 - fwidth(q) * 1.2, 0., 1.);
	float s = sin(q);
	float v = 0.42 + 0.4 * lt * (0.7 + 0.3 * rg) + pow(1. - max(dot(N, V), 0.), 3.) * 0.15 + smoothstep(0.5, 1., s) * aa * 0.1 - smoothstep(0.55, 1., -s) * aa * 0.08 - (1. - rg) * 0.05 - dep * 0.14 + cau(vw) * max(N.y, 0.) * 0.06;
	vec3 a, b;
	ff = fgi(vw, fg);
	vec3 c = cwf(pk4, pk5, pk6, pk7, vec4(0., 0.36, 0.8, 1.), v, 0., fg, ff, a, b);
	gl_FragColor = fin(c, a, b, 1., N, V);
}`,
	mirror: `
void main() {
	vec3 N = normalize(vnr), V = normalize(cameraPosition - vw);
	vec3 p = normalize(vl);
	float nv = max(dot(N, V), 0.);
	vec3 R = reflect(-V, N);
	vec3 a = pk0, b = pk1;
	vec3 c = mix(pk0, pk1, 0.6);
	vec3 ep, eq;
	vec3 e = wcp(bgt(vw, R * vec3(1., 2.2, 1.), 400., 0.), ep, eq);
	wlk(c, a, b, e, ep, eq, 0.12 + 0.88 * pow(1. - nv, 4.));
	wlk(c, a, b, pk6, pk6, pk6, pow(max(R.y, 0.), 48.) * 0.85);
	vec3 id;
	float st = sdt(p, 9., vs, 0.12, 0.07, 0.16, id);
	float sa = st * (0.6 + 0.4 * sin(ut * 2. + hs(id) * 6.28)) * aaf(p * 9.);
	c = mix(c, pk7, sa);
	if (sa > 0.5) {
		a = pk7;
		b = pk7;
	}
	ff = fgi(vw, fg);
	vec3 gp, gq;
	vec3 gc = wcp(fg, gp, gq);
	wlk(c, a, b, gc, gp, gq, ff);
	gl_FragColor = fin(c, a, b, 1., N, V);
}`
}

export function make(rd, seed) {
	const mob = !!rd.mob
	const R = rng(seed)
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 420)
	camera.rotation.order = 'YXZ'
	camera.position.set(0, -24, 30)
	camera.rotation.set(-0.06, 0, 0)
	const bms = []
	for (let i = 0; i < 8; i++) bms.push(new THREE.Vector4((R() * 2 - 1) * 42 - 4, R() * 75 - 50, 1.6 + R() * 2, R()))
	const u = { ut: { value: 0 }, bms: { value: bms }, pr: { value: 1 }, ph: { value: 400 } }
	const v2 = new THREE.Vector2(), tmp = new THREE.Vector3(), fw = new THREE.Vector3()
	const add = { blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }

	const bg = new THREE.Mesh(new THREE.SphereGeometry(360, 48, 24), new THREE.ShaderMaterial({
		side: THREE.BackSide,
		depthWrite: false,
		uniforms: { ut: u.ut, bms: u.bms },
		vertexShader: `varying vec3 vd;
void main() {
	vd = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`,
		fragmentShader: `${glsl}
${nois}
${wgl}
varying vec3 vd;
void main() {
	vec3 d = normalize(vd);
	float w = smoothstep(0.6, 0.98, d.y) * exp(cameraPosition.y / 38.);
	float sh = smoothstep(0.5, 0.85, vn(vec3(d.xz / max(d.y, 0.2) * 3., ut * 0.4)));
	vec3 a, b;
	gl_FragColor = vec4(dsp(wcp(bgt(cameraPosition, d, 400., w * sh * 12.), a, b)), 1.);
}`
	}))
	bg.renderOrder = -1
	scene.add(bg)

	const n = mob ? 70 : 140
	const all = []
	const ok = (x, y, z, s) => {
		if (Math.hypot(x, y + 24, z - 30) < s * 3 + 9) return false
		for (const b of all) if ((b.x - x) ** 2 + (b.y - y) ** 2 + (b.z - z) ** 2 < (b.s + s + 0.8) ** 2) return false
		return true
	}
	kinds.forEach(k => {
		const m = k === 'mirror' ? 3 : n
		for (let i = 0; i < m; i++) {
			let x = 0, y = 0, z = 0, s = 1
			for (let j = 0; j < 40; j++) {
				if (k === 'mirror') {
					s = 1.3 + R() * 0.6
					x = (R() * 2 - 1) * 26
					y = -68 - R() * 6
					z = (R() * 2 - 1) * 26
				} else {
					s = 0.2 + 2.8 * Math.pow(R(), 3.4)
					x = (R() * 2 - 1) * 70
					y = -6 - R() * 52
					z = (R() * 2 - 1) * 70
				}
				if (ok(x, y, z, s)) break
			}
			const ax = new THREE.Vector3(R() - 0.5, R() * 1.5, R() - 0.5).normalize()
			all.push({
				k, id: i, n: all.length, x, y, z, s, seed: Math.floor(R() * 1e9),
				am: [0.12 + R() * 0.2, R() * 6.2832, 0.15 + R() * 0.25, R() * 6.2832],
				ar: [ax.x, ax.y, ax.z, (0.05 + R() * 0.2) * (R() < 0.5 ? -1 : 1)],
				an: [R(), i]
			})
		}
	})

	const geo = new THREE.SphereGeometry(1, mob ? 24 : 36, mob ? 16 : 24)
	geo.deleteAttribute('uv')
	const mesh = {}
	kinds.forEach(k => {
		const list = all.filter(b => b.k === k)
		const g = geo.clone()
		const am = new Float32Array(list.length * 4), ar = new Float32Array(list.length * 4), an = new Float32Array(list.length * 2)
		list.forEach((b, i) => {
			am.set(b.am, i * 4)
			ar.set(b.ar, i * 4)
			an.set(b.an, i * 2)
		})
		g.setAttribute('am', new THREE.InstancedBufferAttribute(am, 4))
		g.setAttribute('ar', new THREE.InstancedBufferAttribute(ar, 4))
		g.setAttribute('an', new THREE.InstancedBufferAttribute(an, 2))
		const mat = new THREE.ShaderMaterial({
			uniforms: { ut: u.ut, bms: u.bms, hov: { value: -1 }, opq: { value: mob ? 1 : 0 } },
			vertexShader: svs,
			fragmentShader: sfh + fsh[k],
			transparent: k === 'rain' && !mob
		})
		const im = new THREE.InstancedMesh(g, mat, list.length)
		const m4 = new THREE.Matrix4()
		list.forEach((b, i) => {
			m4.makeScale(b.s, b.s, b.s).setPosition(b.x, b.y, b.z)
			im.setMatrixAt(i, m4)
		})
		im.frustumCulled = false
		scene.add(im)
		mesh[k] = im
	})
	geo.dispose()

	{
		const np = mob ? 1500 : 3000
		const pos = new Float32Array(np * 3), ps = new Float32Array(np)
		for (let i = 0; i < np; i++) {
			pos.set([(R() * 2 - 1) * 35, (R() * 2 - 1) * 35 - 24, (R() * 2 - 1) * 35], i * 3)
			ps[i] = R()
		}
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
		g.setAttribute('ps', new THREE.BufferAttribute(ps, 1))
		const pp = new THREE.Points(g, new THREE.ShaderMaterial({
			...add,
			uniforms: { ut: u.ut, pr: u.pr },
			vertexShader: `${glsl}
attribute float ps;
uniform float ut, pr;
varying vec3 vc;
varying float va;
void main() {
	vec3 p = position + vec3(0.22, -0.1, 0.16) * ut * (0.3 + ps);
	p = mod(p - cameraPosition + 35., 70.) - 35. + cameraPosition;
	vec4 mv = viewMatrix * vec4(p, 1.);
	gl_Position = projectionMatrix * mv;
	float d = max(-mv.z, 0.1);
	gl_PointSize = clamp((0.8 + ps * 1.5) * pr * 16. / d, 1., 4. * pr);
	va = smoothstep(0.8, 4., d) * (1. - smoothstep(16., 33., d)) * (0.3 + 0.7 * exp(min(p.y, 0.) / 28.)) * step(p.y, -0.3);
	vc = dsp(mix(pk3, pk6, exp(min(p.y, 0.) / 24.)));
}`,
			fragmentShader: `
varying vec3 vc;
varying float va;
void main() {
	vec2 q = gl_PointCoord * 2. - 1.;
	float r = dot(q, q);
	if (r > 1.) discard;
	gl_FragColor = vec4(vc * exp(-r * 3.) * va * 0.3, 1.);
}`
		}))
		pp.frustumCulled = false
		scene.add(pp)
	}

	{
		const nq = mob ? 110 : 220
		const pos = new Float32Array(nq * 3), bb = new Float32Array(nq * 4)
		for (let i = 0; i < nq; i++) {
			pos.set([(R() * 2 - 1) * 28, (R() * 2 - 1) * 28 - 24, (R() * 2 - 1) * 28], i * 3)
			bb.set([0.04 + Math.pow(R(), 2) * 0.12, 0.5 + R() * 1.1, R() * 6.28, R()], i * 4)
		}
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
		g.setAttribute('bb', new THREE.BufferAttribute(bb, 4))
		const bq = new THREE.Points(g, new THREE.ShaderMaterial({
			...add,
			uniforms: { ut: u.ut, ph: u.ph },
			vertexShader: `
attribute vec4 bb;
uniform float ut, ph;
varying float va;
void main() {
	vec3 p = position;
	p.y += ut * bb.y;
	p.x += sin(ut * 1.3 + bb.z) * 0.22;
	p.z += cos(ut * 1.1 + bb.z) * 0.22;
	p = mod(p - cameraPosition + 28., 56.) - 28. + cameraPosition;
	vec4 mv = viewMatrix * vec4(p, 1.);
	gl_Position = projectionMatrix * mv;
	float d = max(-mv.z, 0.1);
	gl_PointSize = clamp(bb.x * projectionMatrix[1][1] * ph / d, 1.5, 40.);
	va = smoothstep(0.6, 3., d) * (1. - smoothstep(16., 27., d)) * step(p.y, -0.4);
}`,
			fragmentShader: `${glsl}
varying float va;
void main() {
	vec2 q = gl_PointCoord * 2. - 1.;
	float r = length(q);
	if (r > 1. || va < 0.01) discard;
	float rg = smoothstep(0.62, 0.86, r) * (1. - smoothstep(0.9, 1., r));
	float hl = 1. - smoothstep(0., 0.2, length(q - vec2(-0.32, -0.36)));
	gl_FragColor = vec4((dsp(pk6) * rg * 0.4 + dsp(pk7) * hl * 0.45) * va, 1.);
}`
		}))
		bq.frustumCulled = false
		scene.add(bq)
	}

	const ray = new THREE.Raycaster()
	let t0 = 0, hk = null, vel = 0

	function ctr(b, t, out) {
		return out.set(
			b.x + Math.sin(t * b.am[0] + b.am[1]) * 0.45,
			b.y + Math.sin(t * b.am[2] + b.am[3]) * 0.7,
			b.z + Math.cos(t * b.am[0] * 0.8 + b.am[3]) * 0.45)
	}

	function pick(nx, ny, clk) {
		ray.setFromCamera(v2.set(nx, ny), camera)
		const o = ray.ray.origin, d = ray.ray.direction
		let best = null, bt = 95
		for (const b of all) {
			ctr(b, t0, tmp).sub(o)
			const pb = tmp.dot(d)
			const q = tmp.lengthSq() - pb * pb
			if (q > b.s * b.s) continue
			const th = pb - Math.sqrt(b.s * b.s - q)
			if (th > 0.05 && th < bt) {
				bt = th
				best = b
			}
		}
		if (!clk) {
			hk = best
			kinds.forEach(k => {
				mesh[k].material.uniforms.hov.value = best && best.k === k ? best.id : -1
			})
		}
		if (!best) return null
		const b = best
		return {
			kind: b.k, nm: names[b.k], seed: b.seed, idx: b.n, rad: b.s, go: b.k,
			at: () => ctr(b, t0, new THREE.Vector3()),
			anc: ctr(b, t0, new THREE.Vector3()).add(tmp.set(0, b.s * 1.35 + 0.35, 0))
		}
	}

	function update(dt, t, inp) {
		t0 = t
		u.ut.value = t
		if (!inp.fly) {
			if (inp.dx || inp.dy) {
				camera.rotation.y += inp.dx * 0.0032
				camera.rotation.x = Math.min(Math.max(camera.rotation.x + inp.dy * 0.0032, -1.35), 1.35)
				camera.rotation.z = 0
			}
			vel = Math.min(Math.max(vel - inp.wh * 0.035, -20), 20) * Math.exp(-dt * 3.5)
			camera.getWorldDirection(fw)
			camera.position.addScaledVector(fw, vel * dt)
			const p = camera.position
			p.set(Math.min(Math.max(p.x, -62), 62), Math.min(Math.max(p.y, -66), -5), Math.min(Math.max(p.z, -62), 62))
		}
		camera.updateMatrixWorld()
		bg.position.copy(camera.position)
		rd.getDrawingBufferSize(v2)
		u.pr.value = rd.getPixelRatio()
		u.ph.value = v2.y * 0.5
		let foc = null
		if (hk) {
			ctr(hk, t, tmp)
			const d = tmp.distanceTo(camera.position)
			tmp.project(camera)
			if (tmp.z < 1 && d > hk.s) foc = { x: tmp.x, y: tmp.y, r: hk.s / Math.sqrt(d * d - hk.s * hk.s) / Math.tan(camera.fov * Math.PI / 360), k: 0.35 }
		}
		return { foc, bk: 1 }
	}

	function dispose() {
		scene.traverse(o => {
			if (o.geometry) o.geometry.dispose()
			if (o.material) o.material.dispose()
		})
	}

	return { scene, camera, update, pick, dispose }
}
