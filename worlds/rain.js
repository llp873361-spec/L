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

const rgl = ld => `
uniform float ut, lt;
uniform vec4 rv, bo;
const vec3 ld = vec3(${f4(ld.x)}, ${f4(ld.y)}, ${f4(ld.z)});
vec3 rch(float t) {
	t = clamp(t, 0., 4.);
	return t < 1. ? mix(pk1, pk2, t) : t < 2. ? mix(pk2, pk3, t - 1.) : t < 3. ? mix(pk3, pk6, t - 2.) : mix(pk6, pk7, t - 3.);
}
vec3 rcw(float t) {
	t = clamp(t, 0., 4.);
	return t < 1. ? mix(pk1, pk2, t) : t < 1.75 ? mix(pk2, pk4, (t - 1.) / 0.75) : t < 2.1 ? mix(pk4, pk5, (t - 1.75) / 0.35) : t < 3. ? mix(pk5, pk6, (t - 2.1) / 0.9) : mix(pk6, pk7, t - 3.);
}
vec3 rcm(float t, float w) {
	return mix(rch(t), rcw(t), clamp(w, 0., 1.));
}
float hzn(float az) {
	return 1.95 + 0.75 * pow(max(cos(az - ${f4(Math.atan2(ld.x, -ld.z))}), 0.), 12.);
}
float sky(vec3 d) {
	float el = d.y, az = atan(d.x, -d.z);
	float h = max(el, 0.);
	float t = hzn(az) - 0.8 * smoothstep(0., 0.3, h);
	vec2 cp = d.xz / (h + 0.06);
	float cl = fbm(vec3(cp * 0.35 + vec2(ut * 0.012, 0.), 1.7));
	t += (cl - 0.5) * 0.7 * smoothstep(0.015, 0.12, h);
	float gy = (el - ld.y - 0.008 * sin(az * 5. + 1.3)) / (0.009 + 0.013 * cl);
	float gx = (az - ${f4(Math.atan2(ld.x, -ld.z))}) / 0.26;
	float gp = exp(-gy * gy - gx * gx * 1.2) * smoothstep(0.4, 0.7, cl + 0.2 * exp(-gx * gx));
	t += gp * 1.9 + pow(max(dot(d, ld), 0.), 60.) * 0.5 + pow(max(dot(d, ld), 0.), 7.) * 0.3;
	float hl = 0.012 + 0.012 * vn(vec3(az * 2.3, 4., 1.)) + 0.004 * vn(vec3(az * 7., 6., 2.));
	t = mix(t, hzn(az) - 0.22, (1. - smoothstep(hl - 0.002, hl + 0.002, el)) * step(-0.002, el) * 0.55);
	float st = 0.004 + 0.004 * vn(vec3(az * 9., 2., 5.)) + 0.0022 * vn(vec3(az * 150., 1., 7.));
	float sh = (1. - smoothstep(st - 0.001, st + 0.0008, el)) * step(-0.002, el);
	float rn = vn(vec3((az + el * 0.12) * 380., el * 8. + ut * 6., 3.));
	t += smoothstep(0.55, 0.95, rn) * (1. - smoothstep(0.02, 0.16, h)) * smoothstep(-0.005, 0.01, el) * (0.05 + 0.3 * pow(max(dot(d, ld), 0.), 3.));
	t = mix(t, 3.02 + 0.3 * pow(max(dot(d, ld), 0.), 4.), lt * 0.9);
	t = mix(t, mix(hzn(az) - 0.5, 0.45, lt), sh * 0.85);
	if (bo.z > 0.) {
		float bx = bo.x + (fbm(vec3(el * 14., bo.y, 1.)) - 0.5) * 0.09 + (vn(vec3(el * 90., bo.y, 3.)) - 0.5) * 0.012;
		float bl = (exp(-pow((az - bx) / 0.0022, 2.)) + 0.4 * exp(-pow((az - bx) / 0.012, 2.))) * step(0., el) * (1. - smoothstep(0.1, 0.19, el));
		t = mix(t, 4., bl * bo.z);
	}
	return t;
}
float fgt(vec3 wp, out float tf) {
	vec3 d = wp - cameraPosition;
	float l = length(d);
	tf = hzn(atan(d.x, -d.z));
	tf = mix(tf, 2.95, lt * 0.85);
	return 1. - exp(-l / 70.);
}
const vec2 dwv = vec2(0.9322, 0.3620);
float wnd(vec2 p) {
	float g = 0.5 + 0.5 * sin(dot(p, dwv) * 0.45 - ut * 2.2 + vn(vec3(p * 0.05, ut * 0.08)) * 3.);
	return 0.3 + 0.2 * sin(ut * 0.4) + 0.85 * g * g * g;
}
float rvl(vec2 p) {
	return rv.w * smoothstep(rv.z * 0.55 - 1., rv.z + 0.5, distance(p, rv.xy));
}
`

export function make(rd, seed) {
	const mob = !!rd.mob
	const R = rng(seed)
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 3000)
	const ga = (R() - 0.5) * 0.5
	const ld = new THREE.Vector3(Math.sin(ga), 0.1, -Math.cos(ga)).normalize()
	const u = {
		ut: { value: 0 }, lt: { value: 0 }, rv: { value: new THREE.Vector4(0, -4, 0, 1) }, bo: { value: new THREE.Vector4(0, 0, 0, 0) },
		bd: { value: [new THREE.Vector4(0, 0, -99, 0), new THREE.Vector4(0, 0, -99, 0), new THREE.Vector4(0, 0, -99, 0)] },
		rs: { value: new THREE.Vector2(1, 1) }, pr: { value: 1 }, nl: { value: mob ? 1 : 2 }
	}
	const rg = rgl(ld)

	const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 24), new THREE.ShaderMaterial({
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
${rg}
varying vec3 vd;
void main() {
	vec3 d = normalize(vd);
	float t = sky(d);
	float tf = hzn(atan(d.x, -d.z));
	t = mix(t, tf, rv.w * (1. - smoothstep(0.55, 1., rv.z / 140.)));
	gl_FragColor = vec4(dsp(rch(t)), 1.);
}`
	}))
	sky.renderOrder = -1
	scene.add(sky)

	{
		const g = new THREE.PlaneGeometry(4000, 4000, 1, 1)
		g.rotateX(-Math.PI / 2)
		scene.add(new THREE.Mesh(g, new THREE.ShaderMaterial({
			uniforms: u,
			vertexShader: `varying vec3 vw;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.);
	vw = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`,
			fragmentShader: `${glsl}
${nois}
${rg}
uniform vec4 bd[3];
uniform float nl;
varying vec3 vw;
float rng1(vec2 p, float s, float o, inout vec2 g) {
	vec2 cp = p / s, ci = floor(cp);
	float hl = 0.;
	for (int i = -1; i <= 1; i++) {
		for (int j = -1; j <= 1; j++) {
			vec2 id = ci + vec2(float(i), float(j)) + o;
			float T = 1. + 0.7 * hs(id + 4.1);
			float tau = mod(ut + hs(id) * 13.7, T);
			vec2 c = (id - o + 0.15 + 0.7 * vec2(hs(id + 1.3), hs(id + 2.7))) * s;
			vec2 q = p - c;
			float d = length(q);
			float fa = (1. - tau / T);
			fa *= fa;
			for (int k = 0; k < 2; k++) {
				float rr = (tau - float(k) * 0.16) * 0.34;
				if (rr > 0.) {
					float x = (d - rr) / 0.02;
					float e = exp(-x * x);
					g += fa * 0.9 * e * (-2. * x * cos(x * 2.4) - 2.4 * sin(x * 2.4)) * q / max(d, 1e-3);
					hl = max(hl, e * fa);
				}
			}
		}
	}
	return hl;
}
void main() {
	vec3 V = vw - cameraPosition;
	float l = length(V);
	V /= l;
	vec2 p = vw.xz;
	vec2 g = vec2(0.);
	float fw = length(fwidth(p));
	vec2 pp = p;
	float cal = 1.;
	for (int i = 0; i < 3; i++) {
		vec4 b = bd[i];
		float tau = ut - b.z;
		if (tau > 0. && tau < 7.) {
			vec2 q = p - b.xy;
			float d = length(q);
			float Rb = 1.25 * tau, w = 0.09 + 0.07 * tau;
			float x = (d - Rb) / w;
			float A = b.w * 0.55 / (1. + tau * 1.1);
			vec2 dr = q / max(d, 1e-3);
			g += A * exp(-x * x) * (-2. * x * cos(x * 2.6) - 2.6 * sin(x * 2.6)) * dr;
			pp -= dr * 0.35 * exp(-pow((d - Rb + 0.3) / 0.45, 2.)) * b.w / (1. + tau * 0.6);
			cal *= 1. - 0.85 * b.w * (1. - smoothstep(Rb - 0.6, Rb + 0.1, d)) * (1. - smoothstep(1.5, 5., tau));
		}
	}
	float aa = 1. - smoothstep(0.012, 0.035, fw);
	float hl = 0.;
	if (aa > 0.01) {
		vec2 gs = vec2(0.);
		hl = rng1(pp, 0.62, 0., gs);
		if (nl > 1.5) hl = max(hl, rng1(pp + 3.7, 0.41, 17., gs));
		g += gs * aa * cal;
		hl *= aa * cal;
	}
	g += (vec2(vn(vec3(p * 3., ut * 0.7)), vn(vec3(p * 3. + 5., ut * 0.7))) - 0.5) * 0.06;
	vec3 n = normalize(vec3(-g.x * 0.09, 1., -g.y * 0.09));
	vec3 r = reflect(V, n);
	r.y = abs(r.y);
	float F = 0.1 + 0.9 * pow(1. - max(dot(-V, n), 0.), 5.);
	float tb = 0.3 + 0.35 * vn(vec3(p * 0.9, 3.)) + 0.15 * vn(vec3(p * 4.1, 7.));
	float t = mix(tb, sky(r), F);
	float sp = pow(max(dot(r, ld), 0.), 90.) * (0.8 + 1.4 * hl) * (1. - lt);
	t += sp;
	float tf;
	float ff = fgt(vw, tf);
	t = mix(t, tf, ff);
	t = mix(t, hzn(atan(V.x, -V.z)), rvl(p));
	gl_FragColor = vec4(dsp(rcm(t, min(sp * 1.5, 1.) * (1. - ff))), 1.);
}`
		})))
	}

	const isl = []
	{
		const mk = (az, d, rx, rz, h) => {
			const w = []
			for (let k = 2; k <= 5; k++) w.push([(0.05 + R() * 0.1) / (k - 1), k, R() * 6.283])
			isl.push({ x: Math.sin(az) * d, z: -Math.cos(az) * d, rx, rz, ro: R() * Math.PI, h, w, d })
		}
		mk(ga + (R() - 0.5) * 0.3, 26 + R() * 12, 7 + R() * 4, 3 + R() * 2, 0.3 + R() * 0.2)
		mk(-(0.45 + R() * 0.35), 11 + R() * 9, 2.6 + R() * 2.2, 1.6 + R() * 1.4, 0.2 + R() * 0.15)
		mk(0.5 + R() * 0.35, 15 + R() * 12, 3 + R() * 3, 1.8 + R() * 1.6, 0.2 + R() * 0.15)
		for (let k = 0; k < 4; k++) mk((R() - 0.5) * 1.7, 75 + R() * 110, 9 + R() * 16, 4 + R() * 7, 0.3 + R() * 0.3)
	}
	const ie0 = (q, th) => 1 + q.w.reduce((a, w) => a + w[0] * Math.sin(w[1] * th + w[2]), 0)
	const ipt = (q, r, th) => {
		const e = ie0(q, th) * r
		const lx = Math.cos(th) * q.rx * e, lz = Math.sin(th) * q.rz * e
		return [q.x + lx * Math.cos(q.ro) - lz * Math.sin(q.ro), q.z + lx * Math.sin(q.ro) + lz * Math.cos(q.ro)]
	}
	const ihg = (q, r, th) => q.h * (1 - sst(0.35, 1, r)) - 0.35 * sst(0.95, 1.3, r) + 0.04 * Math.sin(th * 5 + r * 9) * (1 - r)
	const imat = (mr, vs, fs, ro) => {
		const m = new THREE.ShaderMaterial({
			uniforms: { ...u, mir: { value: mr } },
			side: THREE.DoubleSide,
			blending: mr > 0 ? THREE.NoBlending : THREE.CustomBlending,
			blendSrc: THREE.SrcAlphaFactor,
			blendDst: THREE.OneMinusSrcAlphaFactor,
			alphaToCoverage: mr > 0 && !mob,
			depthTest: mr > 0,
			depthWrite: mr > 0,
			vertexShader: vs,
			fragmentShader: fs
		})
		return [m, ro + (mr > 0 ? 1 : 0)]
	}
	{
		const K = 14, M = 56, P = [], E = [], I = []
		for (const q of isl) {
			const o = P.length / 3
			for (let i = 0; i <= K; i++) {
				const r = 1.3 * i / K
				for (let j = 0; j < M; j++) {
					const th = j / M * Math.PI * 2
					const [x, z] = ipt(q, r, th)
					P.push(x, ihg(q, r, th), z)
					E.push(r)
					if (i) {
						const a = o + (i - 1) * M + j, b = o + (i - 1) * M + (j + 1) % M
						I.push(a, b + M, a + M, a, b, b + M)
					}
				}
			}
		}
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
		g.setAttribute('ie', new THREE.Float32BufferAttribute(E, 1))
		g.setIndex(I)
		for (const mr of [-1, 1]) {
			const [mt, ro] = imat(mr, `attribute float ie;
uniform float mir;
varying vec3 vw;
void main() {
	vec3 p = position;
	if (mir < 0.) p.y = -p.y;
	vw = p;
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
}`, `${glsl}
${nois}
${rg}
uniform float mir;
varying vec3 vw;
void main() {
	float oy = mir < 0. ? -vw.y : vw.y;
	if (mir < 0. && oy < 0.) discard;
	vec3 V = normalize(vw - cameraPosition);
	float n = vn(vec3(vw.xz * 1.1, 2.)) * 0.55 + vn(vec3(vw.xz * 5., 5.)) * 0.3 + vn(vec3(vw.xz * 23., 8.)) * 0.15;
	float fs = pow(max(dot(V, ld), 0.), 5.) * (1. - lt);
	float c = 0.12 + 0.25 * n;
	float wt = 1. - smoothstep(0., 0.1, oy);
	c += wt * (0.2 + 0.45 * fs) + fs * 0.15 * n;
	c = mix(c, 0.2, lt * 0.6);
	float a = 1.;
	if (mir < 0.) {
		c *= 0.85;
		a = 0.8 * (0.1 + 0.9 * pow(1. - abs(V.y), 5.));
	}
	float tf;
	float ff = fgt(vw, tf);
	c = mix(c, tf, ff);
	c = mix(c, hzn(atan(V.x, -V.z)), rvl(vw.xz));
	gl_FragColor = vec4(dsp(rch(c)), a);
}`, 1)
			const m = new THREE.Mesh(g, mt)
			m.frustumCulled = false
			m.renderOrder = ro
			scene.add(m)
		}
	}
	{
		const nli = mob ? 9000 : 30000, nsg = mob ? 2000 : 6000, nst = mob ? 1600 : 5000
		const lfs = [], sts = []
		const irad = (q, x, z) => {
			const dx = x - q.x, dz = z - q.z
			const ex = (dx * Math.cos(q.ro) + dz * Math.sin(q.ro)) / q.rx, ez = (-dx * Math.sin(q.ro) + dz * Math.cos(q.ro)) / q.rz
			return Math.hypot(ex, ez) / ie0(q, Math.atan2(ez, ex))
		}
		const clump = (x, y, z, big) => {
			const m = big ? 5 + Math.floor(R() * 6) : 7 + Math.floor(R() * 10)
			const l0 = big ? 0.55 + R() * 0.9 : 0.18 + R() * 0.35
			for (let k = 0; k < m; k++) {
				const az = R() * 6.283
				lfs.push([x + Math.cos(az) * R() * 0.05, y, z + Math.sin(az) * R() * 0.05, l0 * (0.55 + 0.45 * R()),
					az, 0.08 + R() * 0.45, big ? 0.5 + R() * 1.5 : 0.4 + R() * 1.2, big ? 0.012 + R() * 0.01 : 0.006 + R() * 0.006,
					(R() - 0.5) * 2.5, 0.6 + R() * 0.8, R(), R()])
			}
			if (big && R() < 0.75) sts.push([x, y, z, 1.1 + R() * 1.1, R() * 6.283, 0.02 + R() * 0.1, 0.5 + R() * 0.6, 0.005 + R() * 0.003, 0.2 + R() * 0.14, 0.035 + R() * 0.025, R(), R()])
		}
		const nears = isl.filter(q => q.d < 75)
		const want = nears.reduce((a, q) => a + Math.PI * q.rx * q.rz * (q.d < 30 ? 28 : 12) * 7.5, 0)
		const ks = Math.min(1, nli / Math.max(want, 1))
		for (const q of nears) {
			const n = Math.round(Math.PI * q.rx * q.rz * (q.d < 30 ? 28 : 12) * ks)
			for (let k = 0; k < n; k++) {
				const r = Math.sqrt(R()) * 1.08, th = R() * 6.283
				const [x, z] = ipt(q, r, th)
				clump(x, Math.max(ihg(q, Math.min(r, 1.3), th), 0), z, true)
			}
		}
		const pc = []
		for (let k = 0; k < 16; k++) {
			const r = 2.5 + Math.pow(R(), 0.8) * 17, a = -Math.PI / 2 + (R() - 0.5) * 2
			pc.push([Math.cos(a) * r, Math.sin(a) * r, 1.2 + R() * 2.8])
		}
		const nl0 = lfs.length
		for (let t = 0; t < 40000 && lfs.length < nl0 + nsg; t++) {
			const q = pc[Math.floor(R() * pc.length)]
			const x = q[0] + (R() + R() + R() - 1.5) * q[2], z = q[1] + (R() + R() + R() - 1.5) * q[2]
			if (z > -1.2 || Math.hypot(x, z) < 1.8 || isl.some(w => irad(w, x, z) < 1.12)) continue
			clump(x, 0, z, false)
		}
		while (sts.length > nst) sts.splice(Math.floor(R() * sts.length), 1)
		const far = (a, b) => Math.hypot(b[0], b[2]) - Math.hypot(a[0], a[2])
		const pack = (arr, geo) => {
			const n = arr.length
			const a = new Float32Array(n * 4), b = new Float32Array(n * 4), c = new Float32Array(n * 4)
			arr.forEach((q, i) => {
				a.set(q.slice(0, 4), i * 4)
				b.set(q.slice(4, 8), i * 4)
				c.set(q.slice(8, 12), i * 4)
			})
			const g = new THREE.InstancedBufferGeometry()
			g.setAttribute('position', geo.getAttribute('position'))
			g.setAttribute('bp', geo.getAttribute('bp'))
			g.setIndex(geo.getIndex())
			g.setAttribute('ia', new THREE.InstancedBufferAttribute(a, 4))
			g.setAttribute('ib', new THREE.InstancedBufferAttribute(b, 4))
			g.setAttribute('ic', new THREE.InstancedBufferAttribute(c, 4))
			g.instanceCount = n
			return g
		}
		const strip = rows => {
			const P = [], B = [], I = []
			for (let r = 0; r <= rows; r++) {
				P.push(0, 0, 0, 0, 0, 0)
				B.push(r, -1, r, 1)
				if (r) {
					const o = (r - 1) * 2
					I.push(o, o + 1, o + 3, o, o + 3, o + 2)
				}
			}
			const g = new THREE.BufferGeometry()
			g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
			g.setAttribute('bp', new THREE.Float32BufferAttribute(B, 2))
			g.setIndex(I)
			return g
		}
		const lgeo = strip(6), sgeo = strip(13)
		const nearby = arr => arr.filter(q => Math.hypot(q[0], q[2]) < 30).sort(far)
		const lvs = `${glsl}
${nois}
${rg}
attribute vec2 bp;
attribute vec4 ia, ib, ic;
uniform float mir;
uniform vec2 rs;
varying vec3 vw, vnr;
varying vec2 vb;
varying float vr, vcv;
vec3 tgl(float s, vec2 dl, float wa) {
	float th = ib.y + ib.z * s * s;
	float al = wa * (0.3 + 1.4 * s);
	vec2 h = dl * sin(th) + dwv * sin(al);
	return normalize(vec3(h.x, cos(th) * cos(al), h.y));
}
void main() {
	vec2 dl = vec2(cos(ib.x), sin(ib.x));
	float wa = wnd(ia.xz) * ic.y * 0.9 + sin(ut * 6.3 + ic.z * 6.283 + ia.x * 0.9 + ia.z * 0.7) * 0.07 * (0.3 + wnd(ia.xz) * ic.y);
	float uu = bp.x / 6.;
	vec3 p = ia.xyz + (tgl(0.2113249 * uu, dl, wa) + tgl(0.7886751 * uu, dl, wa)) * 0.5 * uu * ia.w;
	vec3 tg = tgl(uu, dl, wa);
	float u = bp.x / 6.;
	vec3 ac = vec3(-dl.y, 0., dl.x);
	float tw = ic.x * u;
	ac = normalize(ac * cos(tw) + cross(tg, ac) * sin(tw));
	float w = ib.w * (1. - pow(u, 1.7) * 0.93);
	float dw = max(w, length(p - cameraPosition) * 2.2 / (projectionMatrix[1][1] * rs.y));
	vcv = 1.;
	p += ac * bp.y * dw * 0.5;
	vnr = normalize(cross(ac, tg));
	if (mir < 0.) {
		p.y = -p.y;
		p.x += sin(ut * 3.1 + p.z * 1.7 + ia.x * 2.3) * 0.02 * min(-p.y, 1.);
	}
	vw = p;
	vb = vec2(u, bp.y);
	vr = ic.w;
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
}`
		const lfsh = `${glsl}
${nois}
${rg}
uniform float mir;
varying vec3 vw, vnr;
varying vec2 vb;
varying float vr, vcv;
void main() {
	float s = vb.x;
	vec3 V = normalize(vw - cameraPosition);
	vec3 n = normalize(vnr);
	if (dot(n, V) > 0.) n = -n;
	float fs = pow(max(dot(V, ld), 0.), 5.) * (1. - lt);
	float c = 0.1 + 0.55 * s + 0.2 * vr - 0.05 * (1. - abs(vb.y));
	c += step(0.82, vr) * smoothstep(0.55, 1., s) * 0.45;
	c += fs * (0.15 + 1.3 * s * s) + smoothstep(0.55, 1., abs(vb.y)) * fs * (0.25 + 0.7 * s);
	c += pow(max(dot(reflect(V, n), ld), 0.), 26.) * (0.3 + 0.6 * s) * (1. - lt);
	c = mix(c, 0.2, lt * 0.8);
	float a = vcv;
	if (mir < 0.) {
		c *= 0.8;
		a *= 0.8 * (0.1 + 0.9 * pow(1. - abs(V.y), 5.));
	}
	float tf;
	float ff = fgt(vw, tf);
	c = mix(c, tf, ff);
	c = mix(c, hzn(atan(V.x, -V.z)), rvl(vw.xz));
	gl_FragColor = vec4(dsp(rcm(c, smoothstep(0.03, 0.35, fs) * (1. - ff))), a);
}`
		const svs = `${glsl}
${nois}
${rg}
attribute vec2 bp;
attribute vec4 ia, ib, ic;
uniform float mir;
uniform vec2 rs;
varying vec3 vw;
varying vec2 vb;
varying float vr, vcv;
vec3 tgs(float s, vec2 dl, float wa) {
	float th = ib.y + 0.35 * smoothstep(0.7, 1., s);
	float al = wa * s * s * 1.8;
	vec2 h = dl * sin(th) + dwv * sin(al);
	return normalize(vec3(h.x, cos(th) * cos(al), h.y));
}
vec3 tgp(float s, vec2 dl, float wb) {
	float th = ib.y + 0.35 + 0.9 * s;
	float al = wb * (1.2 + s);
	vec2 h = dl * sin(th) + dwv * sin(al);
	return normalize(vec3(h.x, cos(th) * cos(al), h.y));
}
void main() {
	vec2 dl = vec2(cos(ib.x), sin(ib.x));
	float w0 = wnd(ia.xz) * ib.z;
	float nd = sin(ut * 1.7 + ic.z * 6.283 + ia.x * 0.5) * 0.08 * (0.4 + w0);
	float wa = w0 * 0.55 + nd, wb = w0 * 0.9 + nd * 1.5;
	vec3 p, tg;
	if (bp.x < 8.5) {
		float uu = bp.x / 8.;
		p = ia.xyz + (tgs(0.2113249 * uu, dl, wa) + tgs(0.7886751 * uu, dl, wa)) * 0.5 * uu * ia.w;
		tg = tgs(uu, dl, wa);
	} else {
		float uu = (bp.x - 8.) / 5.;
		p = ia.xyz + (tgs(0.2113249, dl, wa) + tgs(0.7886751, dl, wa)) * 0.5 * ia.w;
		p += (tgp(0.2113249 * uu, dl, wb) + tgp(0.7886751 * uu, dl, wb)) * 0.5 * uu * ic.x;
		tg = tgp(uu, dl, wb);
	}
	vec3 ac = normalize(cross(tg, normalize(cameraPosition - p)));
	float w = bp.x < 8.5 ? ib.w * (1. - 0.45 * bp.x / 8.) : ic.y * pow(sin(3.1416 * clamp((bp.x - 8.) / 5., 0., 1.)), 0.6);
	float dw = max(w, length(p - cameraPosition) * 2.2 / (projectionMatrix[1][1] * rs.y));
	vcv = 1.;
	p += ac * bp.y * dw * 0.5;
	if (mir < 0.) {
		p.y = -p.y;
		p.x += sin(ut * 3.1 + p.z * 1.7 + ia.x * 2.3) * 0.02 * min(-p.y, 1.);
	}
	vw = p;
	vb = vec2(bp.x / 8., bp.y);
	vr = ic.w;
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
}`
		const sfs = `${glsl}
${nois}
${rg}
uniform float mir;
varying vec3 vw;
varying vec2 vb;
varying float vr, vcv;
void main() {
	vec3 V = normalize(vw - cameraPosition);
	float fs = pow(max(dot(V, ld), 0.), 5.) * (1. - lt);
	float c, a = vcv;
	if (vb.x > 1.01) {
		float q = (vb.x - 1.) * 1.6;
		float fb = vn(vec3(vb.y * 6., q * 40. + vr * 30., 2.));
		float m = smoothstep(0.25, 0.6, fb + 0.35 - abs(vb.y) * 0.5);
		if (m < 0.1) discard;
		a *= m;
		c = 1. + 0.35 * fb + fs * 1.7;
	} else {
		c = 0.18 + 0.45 * vb.x + 0.1 * vr + fs * 0.5;
	}
	c = mix(c, 0.25, lt * 0.8);
	if (mir < 0.) {
		c *= 0.85;
		a *= 0.8 * (0.1 + 0.9 * pow(1. - abs(V.y), 5.));
	}
	float tf;
	float ff = fgt(vw, tf);
	c = mix(c, tf, ff);
	c = mix(c, hzn(atan(V.x, -V.z)), rvl(vw.xz));
	gl_FragColor = vec4(dsp(rcm(c, smoothstep(0.03, 0.35, fs) * (1. - ff))), a);
}`
		for (const mr of [-1, 1]) {
			for (const [arr, geo, vs, fs, ro] of [[lfs, lgeo, lvs, lfsh, 1.5], [sts, sgeo, svs, sfs, 1.6]]) {
				const src = mr > 0 ? arr.slice().sort((a, b) => -far(a, b)) : nearby(arr)
				if (!src.length) continue
				const [mt, rr] = imat(mr, vs, fs, ro)
				const m = new THREE.Mesh(pack(src, geo), mt)
				m.frustumCulled = false
				m.renderOrder = rr
				scene.add(m)
			}
		}
		console.log('雨汀植被', lfs.length, '片叶子', sts.length, '根花茎')
	}
	{
		const M = 72, P = [], B = [], I = []
		for (const q of isl) {
			if (q.d < 75) continue
			const o = P.length / 3
			const hb = 1.6 + R() * 0.7
			let u0 = 0, px = null
			for (let j = 0; j <= M; j++) {
				const th = j / M * Math.PI * 2
				const [x, z] = ipt(q, 0.75, th)
				if (px) u0 += Math.hypot(x - px[0], z - px[1])
				px = [x, z]
				const y = ihg(q, 0.75, th) - 0.05
				P.push(x, y, z, x, y + hb, z)
				B.push(u0, 0, u0, 1)
				if (j) {
					const b = o + (j - 1) * 2
					I.push(b, b + 1, b + 3, b, b + 3, b + 2)
				}
			}
		}
		if (P.length) {
			const g = new THREE.BufferGeometry()
			g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
			g.setAttribute('bv', new THREE.Float32BufferAttribute(B, 2))
			g.setIndex(I)
			for (const mr of [-1, 1]) {
				const [mt, ro] = imat(mr, `attribute vec2 bv;
uniform float mir;
varying vec3 vw;
varying vec2 vb;
void main() {
	vec3 p = position;
	if (mir < 0.) p.y = -p.y;
	vw = p;
	vb = bv;
	gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
}`, `${glsl}
${nois}
${rg}
uniform float mir;
varying vec3 vw;
varying vec2 vb;
void main() {
	float top = 0.72 + 0.18 * vn(vec3(vb.x * 0.35, 1., 3.)) + 0.1 * vn(vec3(vb.x * 1.9 - ut * 1.3, 2., 5.));
	float st = vn(vec3(vb.x * 26., 3., 1.));
	float m = 1. - smoothstep(top - 0.05, top + 0.03 + 0.1 * st, vb.y);
	if (m < 0.2) discard;
	vec3 V = normalize(vw - cameraPosition);
	float fs = pow(max(dot(V, ld), 0.), 4.) * (1. - lt);
	float c = 0.2 + 0.7 * vb.y + 0.15 * st + fs * 1.4 * smoothstep(top - 0.25, top, vb.y);
	c = mix(c, 0.3, lt * 0.8);
	float a = smoothstep(0.2, 0.6, m);
	if (mir < 0.) {
		c *= 0.85;
		a *= 0.8 * (0.1 + 0.9 * pow(1. - abs(V.y), 5.));
	}
	float tf;
	float ff = fgt(vw, tf);
	c = mix(c, tf, ff);
	c = mix(c, hzn(atan(V.x, -V.z)), rvl(vw.xz));
	gl_FragColor = vec4(dsp(rcm(c, smoothstep(0.03, 0.35, fs) * (1. - ff))), a);
}`, 1.3)
				const m = new THREE.Mesh(g, mt)
				m.frustumCulled = false
				m.renderOrder = ro
				scene.add(m)
			}
		}
	}

	{
		const P = []
		for (let z = -18; z <= -2; z++) for (let x = -12; x <= 11; x++) for (let k = 0; k < 3; k++) P.push(x, k, z)
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
		const m = new THREE.Points(g, new THREE.ShaderMaterial({
			uniforms: u,
			transparent: true,
			depthWrite: false,
			vertexShader: `${glsl}
${nois}
${rg}
uniform vec2 rs;
uniform float pr;
varying float va, vt, vm;
void main() {
	vec2 id = position.xz;
	float k = position.y;
	float T = 1. + 0.7 * hs(id + 4.1);
	float tau = mod(ut + hs(id) * 13.7, T);
	vec2 c = (id + 0.15 + 0.7 * vec2(hs(id + 1.3), hs(id + 2.7))) * 0.62;
	float th = hs(id + k * 3.3 + 0.7) * 6.283;
	float vh = 0.2 + 0.3 * hs(id + k * 1.9 + 7.);
	float vv = 0.8 + 0.7 * hs(id + k * 2.6 + 11.);
	vec3 p = vec3(c.x + cos(th) * vh * tau, vv * tau - 4.9 * tau * tau, c.y + sin(th) * vh * tau);
	vec4 mv = viewMatrix * vec4(p, 1.);
	gl_Position = projectionMatrix * mv;
	float d = -mv.z;
	float s = 0.004 * projectionMatrix[1][1] * rs.y * 0.5 / max(d, 0.1);
	gl_PointSize = max(s, 1.5 * pr);
	float fs = pow(max(dot(normalize(p - cameraPosition), ld), 0.), 4.);
	va = step(0., p.y) * (1. - smoothstep(0.08, 0.22, tau)) * min(s / (1.5 * pr), 1.) * (0.35 + 0.65 * fs) * (1. - lt) * (1. - rvl(p.xz));
	vt = 2.5 + 1.4 * fs;
	vm = smoothstep(0.03, 0.35, fs);
}`,
			fragmentShader: `${glsl}
${nois}
${rg}
varying float va, vt, vm;
void main() {
	vec2 q = gl_PointCoord * 2. - 1.;
	float r = dot(q, q);
	if (r > 1. || va < 0.01) discard;
	gl_FragColor = vec4(dsp(rcm(vt, vm)), va * exp(-r * 2.5));
}`
		}))
		m.frustumCulled = false
		m.renderOrder = 3
		scene.add(m)
	}

	const bx = new THREE.Vector3(30, 12, 46)
	{
		const nr = mob ? 10000 : 30000
		const g = new THREE.InstancedBufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], 3))
		g.setAttribute('cn', new THREE.Float32BufferAttribute([0, -1, 1, -1, 0, 1, 1, 1], 2))
		g.setIndex([0, 1, 2, 2, 1, 3])
		const ra = new Float32Array(nr * 4), rb = new Float32Array(nr * 4)
		for (let i = 0; i < nr; i++) {
			ra.set([R() * bx.x, R() * bx.y, R() * bx.z, 7.5 + R() * 2.5], i * 4)
			rb.set([0.12 + R() * 0.16, R(), R(), 0.8 + R() * 0.4], i * 4)
		}
		g.setAttribute('ra', new THREE.InstancedBufferAttribute(ra, 4))
		g.setAttribute('rb', new THREE.InstancedBufferAttribute(rb, 4))
		g.instanceCount = nr
		const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
			uniforms: u,
			transparent: true,
			depthWrite: false,
			vertexShader: `${glsl}
${nois}
${rg}
attribute vec2 cn;
attribute vec4 ra, rb;
uniform vec2 rs;
uniform float pr;
varying float vt, va, vm;
varying vec2 vq;
void main() {
	vec3 wd = normalize(vec3(0.9 + 0.6 * sin(ut * 0.4), -ra.w, 0.35 + 0.3 * sin(ut * 0.27 + 1.)));
	vec3 o = vec3(cameraPosition.x - ${f4(bx.x / 2)}, 0., cameraPosition.z - ${f4(bx.z - 6)});
	vec3 q = ra.xyz + vec3(0.9 * ut - 1.5 * cos(ut * 0.4), -ra.w * ut, 0.35 * ut - 1.111 * cos(ut * 0.27 + 1.));
	q = mod(q, vec3(${f4(bx.x)}, ${f4(bx.y)}, ${f4(bx.z)}));
	vec3 p1 = o + q;
	vec3 p0 = p1 - wd * rb.x;
	vec4 c1 = projectionMatrix * viewMatrix * vec4(p1, 1.);
	vec4 c0 = projectionMatrix * viewMatrix * vec4(p0, 1.);
	vq = cn;
	vt = 0.;
	va = 0.;
	if (c1.w < 0.1 || c0.w < 0.1) {
		gl_Position = vec4(2., 2., 2., 1.);
		return;
	}
	vec2 s1 = c1.xy / c1.w * rs * 0.5, s0 = c0.xy / c0.w * rs * 0.5;
	vec2 dd = s1 - s0;
	float ln = length(dd);
	vec2 dr = ln > 0.001 ? dd / ln : vec2(0., 1.);
	vec2 nm = vec2(-dr.y, dr.x);
	float dist = length(p1 - cameraPosition);
	float tw = 0.0022 * rb.w * projectionMatrix[1][1] * rs.y * 0.5 / dist;
	float df = 1. + 2.5 * (1. - smoothstep(0.7, 2.6, dist));
	float dw = max(tw * df, 1.4 * pr);
	float cov = min(tw / dw * 1.6, 1.);
	vec2 sp = mix(s0 - dr * dw * 0.5, s1 + dr * dw * 0.5, cn.x) + nm * cn.y * dw;
	vec4 cp = mix(c0, c1, cn.x);
	gl_Position = vec4(sp / (rs * 0.5) * cp.w, cp.z, cp.w);
	float fs = pow(max(dot(normalize(p1 - cameraPosition), ld), 0.), 6.);
	float I = (0.22 + 1.6 * fs) * exp(-dist / 18.) * (0.55 + 0.45 * rb.y);
	vt = mix(2.1 + 1.8 * min(I, 1.), 0.5, lt);
	vm = smoothstep(0.05, 0.4, fs) * (1. - lt) * exp(-dist / 40.);
	va = mix(clamp(I, 0., 0.9), 0.6 * exp(-dist / 24.), lt) * cov * smoothstep(0., 0.3, q.y) * smoothstep(0.45, 1.2, dist);
}`,
			fragmentShader: `${glsl}
${nois}
${rg}
varying float vt, va, vm;
varying vec2 vq;
void main() {
	float a = va * exp(-vq.y * vq.y * 4.5) * smoothstep(0., 0.3, vq.x) * (1. - smoothstep(0.7, 1., vq.x));
	if (a < 0.003) discard;
	gl_FragColor = vec4(dsp(rcm(vt, vm)), a);
}`
		}))
		m.frustumCulled = false
		m.renderOrder = 4
		scene.add(m)
	}

	const ti = 7
	const cam0 = new THREE.Vector3(0, 1.6, 0)
	const look = new THREE.Vector3()
	const ray = new THREE.Raycaster()
	const v2 = new THREE.Vector2(), hit = new THREE.Vector3()
	const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
	let it = -1, lx = 0, ly = 0, nb = 0, nxt = 12 + R() * 8, lf = -99, lsd = 0, laz = 0, drop = false

	function vfov() {
		const a = camera.aspect
		return a < 1 ? Math.min(2 * Math.atan(Math.tan(25 * Math.PI / 180) / a) * 180 / Math.PI, 85) : 50
	}

	function bang(x, z, s) {
		u.bd.value[nb].set(x, z, u.ut.value, s)
		nb = (nb + 1) % 3
	}

	function update(dt, t, inp) {
		if (it < 0) {
			it = inp.rm ? ti + 1 : 0
			drop = inp.rm
		}
		it += dt
		u.ut.value += dt
		const fv = vfov()
		if (camera.fov !== fv) {
			camera.fov = fv
			camera.updateProjectionMatrix()
		}
		if (!drop && it > 1.6) {
			drop = true
			bang(0, -4.2, 1)
		}
		const tau = Math.max(it - 1.6, 0)
		u.rv.value.set(0, -4.2, tau * 4 + tau * tau * 4.2, it < ti ? 1 : 0)
		if (it > nxt) {
			lf = it
			lsd = Math.random() * 100
			laz = (Math.random() - 0.5) * 1.3
			nxt = it + 8 + Math.random() * 11
		}
		const lk = it - lf
		let fl = 0
		if (lk >= 0 && lk < 1.2) {
			fl = inp.rm ? 0.55 * Math.exp(-lk / 0.35) * sst(0, 0.08, lk) : Math.max(Math.exp(-lk / 0.05), 0.65 * Math.exp(-Math.abs(lk - 0.11) / 0.04), 0.85 * Math.exp(-Math.max(lk - 0.24, 0) / 0.12) * sst(0.2, 0.24, lk))
		}
		u.lt.value = fl
		u.bo.value.set(laz, lsd, lk >= 0 && lk < 0.45 ? Math.min(fl * 1.6, 1) : 0, 0)
		rd.getDrawingBufferSize(v2)
		u.rs.value.copy(v2)
		u.pr.value = rd.getPixelRatio()
		lx += (-inp.mx * 0.07 - lx) * (1 - Math.exp(-dt * 2))
		ly += (inp.my * 0.035 - ly) * (1 - Math.exp(-dt * 2))
		camera.position.copy(cam0)
		look.set(cam0.x + Math.sin(lx) * 10, cam0.y - 0.7 + ly * 10, cam0.z - 10)
		camera.lookAt(look)
		camera.updateMatrixWorld()
		sky.position.copy(camera.position)
		return { busy: it < ti, fade: 1 - sst(0, 0.5, it), bk: 0.7 }
	}

	function pick(nx, ny, clk) {
		if (it < ti) return null
		ray.setFromCamera(v2.set(nx, ny), camera)
		if (!ray.ray.intersectPlane(pl, hit)) return null
		if (hit.distanceTo(camera.position) > 60) return null
		if (clk) bang(hit.x, hit.z, 1)
		return { tip: '', anc: hit.clone() }
	}

	function dispose() {
		scene.traverse(q => {
			if (q.geometry) q.geometry.dispose()
			if (q.material) q.material.dispose()
		})
	}

	return { scene, camera, update, pick, dispose }
}
