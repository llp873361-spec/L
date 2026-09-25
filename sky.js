import * as THREE from 'three'
import { glsl, nois } from './palette.js'

const ri = 1.35, ro = 5.8, rh = 1.0, cc = 1.1, kk = 5.2, fov = 34, mz = -1.5
const f3 = v => v.toFixed(4)

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

const bn = new THREE.Vector3(0.35, 1, -0.25).normalize()

const dgl = `
uniform float ut;
float dtx(float r, float a) {
	float w = 2.4 * pow(r, -1.5);
	float lr = log(r);
	float s = 0.;
	for (int k = 0; k < 2; k++) {
		float ph = fract(ut / 6. + float(k) * 0.5);
		float b = a - w * ph * 6.;
		vec3 q = vec3(cos(b) * 1.7, sin(b) * 1.7, lr * 15.) + float(k) * 7.31;
		float n = vn(q) * 0.62 + vn(q * vec3(2.3, 2.3, 1.9) + 3.1) * 0.38;
		s += n * (1. - abs(ph * 2. - 1.));
	}
	return s;
}
vec3 dcl(float x, float d) {
	vec3 c;
	if (x < 0.08) c = mix(pk7, pk6, x / 0.08);
	else if (x < 0.3) c = mix(pk6, pk5, (x - 0.08) / 0.22);
	else if (x < 0.65) c = mix(pk5, pk4, (x - 0.3) / 0.35);
	else c = mix(pk4, pk2, (x - 0.65) / 0.35);
	return d > 0. ? mix(c, pk5, d * 0.3) : mix(c, pk3, -d * 0.45);
}
float din(float x, float n, float d) {
	return pow(1. - x, 1.3) * (0.2 + 1.2 * n * n) * (1. + 0.55 * d) * (1. - smoothstep(0.72, 1., x));
}
`

const bvs = `
varying vec2 vp;
varying float vs;
void main() {
	vec4 mv = modelViewMatrix * vec4(0., 0., 0., 1.);
	float d = length(mv.xyz);
	vs = 1. / sqrt(max(1. - 1. / (d * d), 0.02));
	vp = position.xy;
	mv.xy += position.xy;
	gl_Position = projectionMatrix * mv;
}`

export function dist(asp) {
	return Math.max(23, 5.6 / (Math.tan(fov * Math.PI / 360) * asp))
}

export function build(rd, seed, lite) {
	const mob = !!rd.mob
	const R = rng(seed)
	const grp = new THREE.Group()
	const far = new THREE.Group()
	const u = {
		ut: { value: 0 }, vt: { value: 0 }, hov: { value: 0 }, pr: { value: 1 },
		rs: { value: new THREE.Vector2(1, 1) }, sd: { value: R() * 50 }, sr: { value: 1.1 }, hz: { value: -2 }
	}
	const v2 = new THREE.Vector2()
	const tmp = new THREE.Vector3()

	const crt = new THREE.WebGLCubeRenderTarget(mob ? 256 : 512, { type: THREE.HalfFloatType, generateMipmaps: false })
	{
		const scn = new THREE.Scene()
		const mat = new THREE.ShaderMaterial({
			side: THREE.BackSide,
			uniforms: { sd: u.sd },
			vertexShader: `varying vec3 vd;
void main() {
	vd = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`,
			fragmentShader: `${glsl}
${nois}
uniform float sd;
varying vec3 vd;
void main() {
	vec3 d = normalize(vd);
	vec3 p = d * 2.1 + sd;
	vec3 w = vec3(fbm(p + 3.1), fbm(p + 7.7), fbm(p + 1.3));
	float n = fbm(d * 2.8 + w * 1.7 + sd);
	float b = exp(-pow(dot(d, ${`vec3(${f3(bn.x)}, ${f3(bn.y)}, ${f3(bn.z)})`}) / 0.3, 2.));
	float cl = smoothstep(0.45, 0.8, n * (0.62 + 0.62 * b));
	float ws = fbm(d * 8.5 + w * 2.4 + sd * 1.7);
	float fl = smoothstep(0.56, 0.82, ws) * smoothstep(0.2, 0.7, cl);
	float dk = (1. - smoothstep(0.2, 0.5, n)) * (1. - b * 0.6);
	vec3 a, e;
	gl_FragColor = vec4(chn(pk0, pk1, pk2, pk3, vec4(0., 0.33, 0.8, 1.), 0.33 - dk * 0.26 + cl * 0.4 + fl * 0.1, a, e), 1.);
}`
		})
		const msh = new THREE.Mesh(new THREE.SphereGeometry(100, 64, 32), mat)
		scn.add(msh)
		const cub = new THREE.CubeCamera(1, 1000, crt)
		cub.update(rd, scn)
		msh.geometry.dispose()
		mat.dispose()
	}

	const bg = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({
		side: THREE.BackSide,
		depthWrite: false,
		uniforms: { cub: { value: crt.texture }, sr: u.sr },
		vertexShader: `varying vec3 vd;
void main() {
	vd = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`,
		fragmentShader: `${glsl}
uniform samplerCube cub;
uniform float sr;
varying vec3 vd;
void main() {
	gl_FragColor = vec4(dsp(mix(pk0, textureCube(cub, normalize(vd)).rgb, 0.3 + 0.7 * min(sr, 1.))), 1.);
}`
	}))
	bg.renderOrder = -2
	far.add(bg)

	const ns = mob ? 15000 : 30000
	{
		const pos = new Float32Array(ns * 3), ai = new Float32Array(ns * 3)
		const d = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3()
		e1.set(1, 0, 0).cross(bn).normalize()
		e2.copy(bn).cross(e1).normalize()
		for (let i = 0; i < ns; i++) {
			const k = R()
			if (k < 0.5) {
				const ct = 1 - R() * (1 - Math.cos(0.9)), ph = R() * Math.PI * 2, st = Math.sqrt(1 - ct * ct)
				d.set(st * Math.cos(ph), st * Math.sin(ph), -ct)
			} else if (k < 0.75) {
				const ph = R() * Math.PI * 2, la = (R() + R() + R() - 1.5) * 0.22
				d.copy(e1).multiplyScalar(Math.cos(ph)).addScaledVector(e2, Math.sin(ph)).multiplyScalar(Math.cos(la)).addScaledVector(bn, Math.sin(la))
			} else {
				const ct = R() * 2 - 1, ph = R() * Math.PI * 2, st = Math.sqrt(1 - ct * ct)
				d.set(st * Math.cos(ph), st * Math.sin(ph), ct)
			}
			d.normalize().multiplyScalar(800)
			pos.set([d.x, d.y, d.z], i * 3)
			const s = Math.min(0.85 * Math.pow(1 - R(), -0.34), 7)
			const c = s > 3.2 ? 0.45 + R() * 0.35 : R() * 0.6
			ai.set([s, c, R()], i * 3)
		}
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
		g.setAttribute('ai', new THREE.BufferAttribute(ai, 3))
		const pts = new THREE.Points(g, new THREE.ShaderMaterial({
			uniforms: { ut: u.ut, pr: u.pr, sr: u.sr, hz: u.hz },
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			transparent: true,
			vertexShader: `${glsl}
attribute vec3 ai;
uniform float ut, pr, sr, hz;
varying vec3 vc;
varying float va;
void main() {
	vec4 mv = modelViewMatrix * vec4(position, 1.);
	gl_Position = projectionMatrix * mv;
	float tw = 0.72 + 0.28 * sin(ut * (0.5 + fract(ai.z * 13.7) * 2.5) + ai.z * 6.283);
	float s = ai.x * pr;
	gl_PointSize = max(s, 1.6 * pr) * 2.4;
	float th = fract(ai.z * 91.7) * (1. - 0.75 * clamp((ai.x - 0.85) / 4., 0., 1.));
	va = tw * clamp(s / (1.6 * pr), 0.3, 1.) * smoothstep(th, th + 0.015, sr) * step(hz * 800., position.y);
	vec3 c = ai.y < 0.5 ? mix(pk5, pk6, ai.y * 2.) : mix(pk6, pk7, (ai.y - 0.5) * 2.);
	vc = dsp(c);
}`,
			fragmentShader: `
varying vec3 vc;
varying float va;
void main() {
	vec2 p = gl_PointCoord * 2. - 1.;
	float r = dot(p, p);
	if (r > 1.) discard;
	float g = exp(-r * 22.) + exp(-r * 5.) * 0.1;
	gl_FragColor = vec4(vc * g * va, 1.);
}`
		}))
		pts.frustumCulled = false
		far.add(pts)
	}
	far.traverse(o => o.layers.set(1))

	const shd = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.ShaderMaterial({
		vertexShader: `void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`,
		fragmentShader: `${glsl}
void main() {
	gl_FragColor = vec4(dsp(pk0), 1.);
}`
	}))
	grp.add(shd)

	const add = { blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }

	const dsk = new THREE.Mesh(new THREE.RingGeometry(ri, ro, 220, 12), new THREE.ShaderMaterial({
		...add,
		side: THREE.DoubleSide,
		uniforms: { ut: u.ut },
		vertexShader: `
varying vec2 vp;
varying float vd;
void main() {
	vp = position.xy;
	vec4 w = modelMatrix * vec4(position, 1.);
	float a = atan(position.y, position.x);
	vec3 v = normalize(mat3(modelMatrix) * vec3(-sin(a), cos(a), 0.));
	vd = dot(v, normalize(cameraPosition - w.xyz));
	gl_Position = projectionMatrix * viewMatrix * w;
}`,
		fragmentShader: `${glsl}
${nois}
${dgl}
varying vec2 vp;
varying float vd;
void main() {
	float r = length(vp);
	float a = atan(vp.y, vp.x);
	float x = clamp((r - ${f3(ri)}) / ${f3(ro - ri)}, 0., 1.);
	float n = dtx(r, a);
	float i = din(x, n, vd) * smoothstep(${f3(ri)}, ${f3(ri + 0.04)}, r);
	i += exp(-pow((r - ${f3(ri + 0.03)}) / 0.03, 2.)) * 0.45 * (1. + 0.5 * vd);
	gl_FragColor = vec4(dsp(dcl(x, vd)) * i * 1.1, 1.);
}`
	}))
	dsk.rotation.x = -75 * Math.PI / 180
	grp.add(dsk)

	const arc = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.ShaderMaterial({
		...add,
		uniforms: { ut: u.ut },
		vertexShader: bvs,
		fragmentShader: `${glsl}
${nois}
${dgl}
varying vec2 vp;
varying float vs;
void main() {
	vec2 p = vp / vs;
	float r = length(p);
	float th = atan(p.y, p.x);
	float sn = sin(th);
	float d = -0.966 * cos(th);
	vec3 c = vec3(0.);
	if (sn > 0.) {
		float x = (r - 1.05) / mix(0.34, 0.78, sn);
		if (x > 0. && x < 1.) {
			float n = dtx(mix(${f3(ri)}, ${f3(ro)}, x), th);
			float i = pow(1. - x, 0.6) * (0.25 + 1.1 * n * n) * (1. + 0.55 * d) * (1. - smoothstep(0.6, 1., x));
			c = dsp(dcl(x * 0.8, d)) * i * smoothstep(0., 0.04, x) * smoothstep(0.02, 0.45, sn) * 1.05;
		}
	} else {
		float x = (r - 1.04) / mix(0.08, 0.2, -sn);
		if (x > 0. && x < 1.) {
			float n = dtx(mix(${f3(ri)}, ${f3(ro)}, x), -th);
			c = dsp(dcl(x, d)) * din(x, n, d) * smoothstep(0.05, 0.6, -sn) * 0.5;
		}
	}
	gl_FragColor = vec4(c, 1.);
}`
	}))
	arc.frustumCulled = false
	grp.add(arc)

	const pho = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), new THREE.ShaderMaterial({
		...add,
		uniforms: { hov: u.hov },
		vertexShader: bvs,
		fragmentShader: `${glsl}
uniform float hov;
varying vec2 vp;
varying float vs;
void main() {
	float r = length(vp) / vs;
	float w = max(0.012, fwidth(r) * 1.4);
	float g = exp(-pow((r - 1. - w) / w, 2.)) * 1.2 + exp(-pow((r - 1.015) / 0.04, 2.)) * 0.05;
	gl_FragColor = vec4(dsp(pk7) * g * (1. + 0.6 * hov), 1.);
}`
	}))
	pho.frustumCulled = false
	grp.add(pho)

	const nv = mob ? 4000 : 8000
	if (!lite) {
		const g = new THREE.InstancedBufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], 3))
		g.setAttribute('cn', new THREE.Float32BufferAttribute([0, -1, 1, -1, 0, 1, 1, 1], 2))
		g.setIndex([0, 1, 2, 2, 1, 3])
		const ia = new Float32Array(nv * 4), ib = new Float32Array(nv * 4)
		for (let i = 0; i < nv; i++) {
			const r0 = 20.5 + R() * 2
			const ph = R() < 0.62 ? Math.floor(R() * 2) * Math.PI + (R() + R() + R() - 1.5) * 0.45 : R() * Math.PI * 2
			const T = (Math.pow(r0, 1.5) - Math.pow(rh, 1.5)) / (1.5 * cc)
			ia.set([r0, ph, R() * T, T], i * 4)
			ib.set([0.9 + Math.pow(R(), 3) * 1.6, R(), (R() - 0.5) * 0.1, R() * 2 - 1], i * 4)
		}
		g.setAttribute('ia', new THREE.InstancedBufferAttribute(ia, 4))
		g.setAttribute('ib', new THREE.InstancedBufferAttribute(ib, 4))
		g.instanceCount = nv
		const vx = new THREE.Mesh(g, new THREE.ShaderMaterial({
			...add,
			uniforms: { vt: u.vt, pr: u.pr, rs: u.rs },
			vertexShader: `${glsl}
attribute vec2 cn;
attribute vec4 ia, ib;
uniform float vt, pr;
uniform vec2 rs;
varying vec3 vc;
varying float va;
varying vec2 vq;
vec3 pos(float tau, out float r) {
	r = pow(max(pow(ia.x, 1.5) - ${f3(1.5 * cc)} * tau, 1e-4), 0.6666667);
	float ph = ia.y + ${f3(kk / cc)} * log(ia.x / r);
	float th = mix(0.2618, 0.72, smoothstep(6., 18., r)) + ib.z - 1.5707963;
	vec3 q = vec3(r * cos(ph), r * sin(ph), ib.w * (0.04 + r * 0.025));
	float c = cos(th), s = sin(th);
	return vec3(q.x, q.y * c - q.z * s, q.y * s + q.z * c);
}
void main() {
	float tau = mod(vt + ia.z, ia.w);
	float r, r0;
	vec3 p1 = pos(tau, r);
	float st = 0.035 + 0.13 * (1. - smoothstep(1.6, 7.5, r));
	vec3 p0 = pos(max(tau - st, 0.), r0);
	vec4 c1 = projectionMatrix * viewMatrix * vec4(p1, 1.);
	vec4 c0 = projectionMatrix * viewMatrix * vec4(p0, 1.);
	vq = cn;
	vc = vec3(0.);
	va = 0.;
	if (c1.w < 0.2 || c0.w < 0.2) {
		gl_Position = vec4(2., 2., 2., 1.);
		return;
	}
	vec2 s1 = c1.xy / c1.w * rs * 0.5;
	vec2 s0 = c0.xy / c0.w * rs * 0.5;
	vec2 d = s1 - s0;
	float ln = length(d);
	vec2 dr = ln > 0.001 ? d / ln : vec2(1., 0.);
	vec2 nm = vec2(-dr.y, dr.x);
	float w = ib.x * pr;
	vec2 sp = mix(s0 - dr * w * 0.5, s1 + dr * w * 0.5, cn.x) + nm * cn.y * w * 0.5;
	vec4 cp = mix(c0, c1, cn.x);
	gl_Position = vec4(sp / (rs * 0.5) * cp.w, cp.z, cp.w);
	vec3 col = r > 8. ? mix(mix(pk4, pk5, 0.5), pk3, smoothstep(8., 16., r)) : mix(mix(pk5, pk6, 0.6), mix(pk4, pk5, 0.5), smoothstep(2., 8., r));
	vc = dsp(col);
	va = smoothstep(${f3(rh)}, ${f3(rh * 1.5)}, r) * (1. - smoothstep(ia.x * 0.9, ia.x, r)) * mix(0.5, 1., smoothstep(2., 7., r)) * mix(1., 0.7, smoothstep(10., 20., r)) * (0.32 + 0.33 * fract(ib.y * 7.3));
}`,
			fragmentShader: `
varying vec3 vc;
varying float va;
varying vec2 vq;
void main() {
	float a = (1. - vq.y * vq.y) * mix(0.3, 1., vq.x) * va;
	gl_FragColor = vec4(vc * a, 1.);
}`
		}))
		vx.frustumCulled = false
		grp.add(vx)
	}

	const nmx = lite ? 0 : 3, nsp = 96
	const trm = new THREE.ShaderMaterial({
		...add,
		side: THREE.DoubleSide,
		vertexShader: `
attribute vec2 al;
varying vec2 va;
void main() {
	va = al;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`,
		fragmentShader: `${glsl}
varying vec2 va;
void main() {
	float a = va.x * va.x * (1. - va.y * va.y);
	gl_FragColor = vec4(dsp(mix(pk6, pk7, va.x * 0.5)) * a * 0.9, 1.);
}`
	})
	const met = []
	for (let i = 0; i < nmx; i++) {
		const g = new THREE.BufferGeometry()
		const pos = new Float32Array(nsp * 6), al = new Float32Array(nsp * 4)
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
		g.setAttribute('al', new THREE.BufferAttribute(al, 2).setUsage(THREE.DynamicDrawUsage))
		const idx = []
		for (let j = 0; j < nsp - 1; j++) idx.push(j * 2, j * 2 + 1, j * 2 + 2, j * 2 + 2, j * 2 + 1, j * 2 + 3)
		g.setIndex(idx)
		g.setDrawRange(0, 0)
		const m = new THREE.Mesh(g, trm)
		m.frustumCulled = false
		grp.add(m)
		met.push({ g, pos, al, on: false, pts: [], cap: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, hl: 1, life: 1 })
	}
	const hg = new THREE.BufferGeometry()
	const hp = new Float32Array(nmx * 3), ha = new Float32Array(nmx)
	hg.setAttribute('position', new THREE.BufferAttribute(hp, 3).setUsage(THREE.DynamicDrawUsage))
	hg.setAttribute('al', new THREE.BufferAttribute(ha, 1).setUsage(THREE.DynamicDrawUsage))
	const hds = new THREE.Points(hg, new THREE.ShaderMaterial({
		...add,
		uniforms: { pr: u.pr },
		vertexShader: `
attribute float al;
uniform float pr;
varying float va;
void main() {
	va = al;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
	gl_PointSize = 10. * pr;
}`,
		fragmentShader: `${glsl}
varying float va;
void main() {
	vec2 p = gl_PointCoord * 2. - 1.;
	float r = dot(p, p);
	if (r > 1. || va < 0.01) discard;
	gl_FragColor = vec4(dsp(pk7) * (exp(-r * 12.) * 1.1 + exp(-r * 3.5) * 0.12) * va, 1.);
}`
	}))
	hds.frustumCulled = false
	grp.add(hds)

	let mt = 1.5, ncap = 2

	function spawn(cam) {
		const m = met.find(q => !q.on && !q.pts.length)
		if (!m) return
		const hy = (cam.position.length() - mz) * Math.tan(cam.fov * Math.PI / 360), hx = hy * cam.aspect
		const a = Math.random() * Math.PI * 2
		if (--ncap <= 0) {
			ncap = 4 + Math.floor(Math.random() * 3)
			const r0 = 10.5, sg = Math.random() < 0.5 ? 1 : -1
			const vt = 5.5 + Math.random(), vr = 3.5 + Math.random()
			m.cap = true
			m.x = Math.cos(a) * r0
			m.y = Math.sin(a) * r0
			m.vx = -Math.cos(a) * vr - Math.sin(a) * vt * sg
			m.vy = -Math.sin(a) * vr + Math.cos(a) * vt * sg
			m.life = 0.8 + Math.random() * 0.4
		} else {
			const dx = Math.cos(a), dy = Math.sin(a)
			const lim = Math.max(4.6, Math.min(hx, hy) * 0.92)
			const b = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * (lim - 4))
			const s0 = -(3 + Math.random() * 6), sp = 12 + Math.random() * 6
			m.cap = false
			m.x = -dy * b + dx * s0
			m.y = dx * b + dy * s0
			m.vx = dx * sp
			m.vy = dy * sp
			m.hl = 0.45 + Math.random() * 0.45
			m.life = 0.5 + Math.random() * 0.7
		}
		m.on = true
		m.age = 0
		m.pts = []
	}

	function mupd(dt, t, cam) {
		mt -= dt
		if (mt <= 0) {
			spawn(cam)
			mt = 2 + Math.random() * 4
		}
		met.forEach((m, i) => {
			if (m.on) {
				if (m.cap) {
					const h = dt / 4
					for (let s = 0; s < 4; s++) {
						const r = Math.max(Math.hypot(m.x, m.y), 0.5)
						const a = 400 / (r * r)
						m.vx -= m.x / r * a * h
						m.vy -= m.y / r * a * h
						const k = Math.exp(-0.5 * h)
						m.vx *= k
						m.vy *= k
						m.x += m.vx * h
						m.y += m.vy * h
					}
					if (Math.hypot(m.x, m.y) < 1.05 || m.age > 6) m.on = false
				} else {
					m.x += m.vx * dt
					m.y += m.vy * dt
					if (m.age > m.hl) m.on = false
				}
				m.age += dt
				m.pts.push([m.x, m.y, t])
			}
			while (m.pts.length && (t - m.pts[0][2] > m.life || m.pts.length > nsp)) m.pts.shift()
			const n = m.pts.length
			for (let j = 0; j < n; j++) {
				const p = m.pts[j], q = m.pts[Math.min(j + 1, n - 1)], o = m.pts[Math.max(j - 1, 0)]
				let dx = q[0] - o[0], dy = q[1] - o[1]
				const l = Math.hypot(dx, dy) || 1
				dx /= l
				dy /= l
				const f = Math.max(0, 1 - (t - p[2]) / m.life)
				const w = 0.045 * (0.25 + 0.75 * j / Math.max(n - 1, 1)) * Math.sqrt(f)
				m.pos.set([p[0] - dy * w, p[1] + dx * w, mz, p[0] + dy * w, p[1] - dx * w, mz], j * 6)
				m.al.set([f, -1, f, 1], j * 4)
			}
			m.g.setDrawRange(0, Math.max(n - 1, 0) * 6)
			m.g.attributes.position.needsUpdate = true
			m.g.attributes.al.needsUpdate = true
			hp.set([m.x, m.y, mz], i * 3)
			ha[i] = m.on ? 1 : 0
		})
		hg.attributes.position.needsUpdate = true
		hg.attributes.al.needsUpdate = true
	}

	let vt = 0
	function upd(dt, t, cam, push, hv) {
		u.ut.value = t
		vt += dt * (1 + 6 * push * push)
		u.vt.value = vt
		u.hov.value = hv
		rd.getDrawingBufferSize(v2)
		u.rs.value.copy(v2)
		u.pr.value = rd.getPixelRatio()
		cam.updateMatrixWorld()
		far.position.copy(cam.position)
		far.updateMatrixWorld()
		mupd(dt, t, cam)
	}

	function lens(cam, push) {
		const c = tmp.set(0, 0, 0).project(cam)
		const d = cam.position.length()
		const r = 1 / Math.sqrt(Math.max(d * d - 1, 1e-3)) / Math.tan(cam.fov * Math.PI / 360)
		return { x: c.x, y: c.y, r, k: 1.55 + push * 1.4, dk: 0.5 + push * 0.35 }
	}

	function dispose() {
		[grp, far].forEach(o => o.traverse(q => {
			if (q.geometry) q.geometry.dispose()
			if (q.material) q.material.dispose()
		}))
		trm.dispose()
		crt.dispose()
	}

	return { grp, far, upd, lens, dispose, sr: u.sr, hz: u.hz, pr: u.pr }
}

export function make(rd, seed) {
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(fov, innerWidth / innerHeight, 0.1, 2000)
	const sk = build(rd, seed)
	scene.add(sk.grp, sk.far)
	const zero = new THREE.Vector3()
	const anc = new THREE.Vector3(0, -2.4, 0)
	let px = 0, py = 0, hv = 0, hov = false
	camera.position.set(0, 0, dist(camera.aspect))
	camera.lookAt(zero)

	function update(dt, t, inp) {
		hv += ((hov ? 1 : 0) - hv) * (1 - Math.exp(-dt * 6))
		if (!inp.fly) {
			px += (-inp.mx * 1.5 + Math.sin(t * 0.07) * 0.3 - px) * (1 - Math.exp(-dt * 4))
			py += (-inp.my * 0.9 - py) * (1 - Math.exp(-dt * 4))
			camera.position.set(px, py, dist(camera.aspect))
			camera.lookAt(zero)
		}
		sk.upd(dt, t, camera, inp.push, hv)
		return { lens: sk.lens(camera, inp.push), bk: 0.5 }
	}

	function pick(nx, ny) {
		const l = sk.lens(camera, 0)
		hov = Math.hypot((nx - l.x) * camera.aspect, ny - l.y) < l.r * 1.9
		return hov ? { tip: '点击进入', at: () => zero, rad: 1, anc } : null
	}

	return { scene, camera, update, pick, dispose: sk.dispose }
}
