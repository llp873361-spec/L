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

const rgl = (ld, trs) => `
uniform float ut, lt;
uniform vec4 rv, bo;
const vec3 ld = vec3(${f4(ld.x)}, ${f4(ld.y)}, ${f4(ld.z)});
vec3 rch(float t) {
	t = clamp(t, 0., 4.);
	return t < 1. ? mix(pk1, pk2, t) : t < 2. ? mix(pk2, pk3, t - 1.) : t < 3. ? mix(pk3, pk6, t - 2.) : mix(pk6, pk7, t - 3.);
}
float hzn(float az) {
	return 1.95 + 0.9 * pow(max(cos(az - ${f4(Math.atan2(ld.x, -ld.z))}), 0.), 10.);
}
float tre(float az, float el) {
	float s = 0.;
${trs.map(q => `	{
		float x = (az - ${f4(q[0])}) / ${f4(q[2])}, y = (el - ${f4(q[1])}) / ${f4(q[3])};
		if (abs(x) < 2.5 && y < 2.5) {
			float e = length(vec2(x, y)) + (vn(vec3(x * 2.3, y * 2.3, ${f4(q[4])})) - 0.5) * 0.7;
			float cn = 1. - smoothstep(0.75, 1.25, e);
			float tk = (1. - smoothstep(0.1, 0.22, abs(x + 0.08 * y))) * step(el, ${f4(q[1])}) * step(0., el);
			s = max(s, max(cn, tk) * ${f4(q[5])});
		}
	}`).join('\n')}
	return s;
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
	t += gp * 1.9 + pow(max(dot(d, ld), 0.), 60.) * 0.5 + pow(max(dot(d, ld), 0.), 6.) * 0.3;
	float sh = (1. - smoothstep(0.004, 0.007 + 0.004 * vn(vec3(az * 9., 2., 5.)), el)) * step(-0.002, el);
	t = mix(t, hzn(az) - 0.45, sh * 0.8);
	t = mix(t, 3.02 + 0.3 * pow(max(dot(d, ld), 0.), 4.), lt * 0.9);
	float tr = tre(az, el);
	t = mix(t, mix(hzn(az) - 0.6, 0.35, lt), tr);
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
	const trs = []
	const nt = 4 + Math.floor(R() * 3)
	for (let i = 0; i < nt; i++) {
		const az = (R() - 0.5) * 1.5, dd = 90 + R() * 140
		const hh = 6 + R() * 7, cw = 2.5 + R() * 3
		trs.push([az, hh * 0.72 / dd, cw / dd, hh * 0.38 / dd, R() * 50, 0.55 + 0.35 * (1 - (dd - 90) / 140)])
	}
	const u = {
		ut: { value: 0 }, lt: { value: 0 }, rv: { value: new THREE.Vector4(0, -4, 0, 1) }, bo: { value: new THREE.Vector4(0, 0, 0, 0) },
		bd: { value: [new THREE.Vector4(0, 0, -99, 0), new THREE.Vector4(0, 0, -99, 0), new THREE.Vector4(0, 0, -99, 0)] },
		rs: { value: new THREE.Vector2(1, 1) }, pr: { value: 1 }, nl: { value: mob ? 1 : 2 }
	}
	const rg = rgl(ld, trs)

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
	t += pow(max(dot(r, ld), 0.), 90.) * (0.8 + 1.4 * hl) * (1. - lt);
	float tf;
	float ff = fgt(vw, tf);
	t = mix(t, tf, ff);
	t = mix(t, hzn(atan(V.x, -V.z)), rvl(p));
	gl_FragColor = vec4(dsp(rch(t)), 1.);
}`
		})))
	}

	{
		const nb = mob ? 350 : 900
		const P = [], K = []
		P.push(-0.5, 0, 0, 0.5, 0, 0, -0.3, 0.5, 0, 0.3, 0.5, 0, 0, 1, 0)
		K.push(0, 0, 0.5, 0.5, 1)
		const g = new THREE.InstancedBufferGeometry()
		g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
		g.setAttribute('kh', new THREE.Float32BufferAttribute(K, 1))
		g.setIndex([0, 1, 3, 0, 3, 2, 2, 3, 4])
		const ga2 = new Float32Array(nb * 4), gb = new Float32Array(nb * 4)
		let i = 0
		while (i < nb) {
			const r = 1.6 + Math.pow(R(), 0.7) * 18, a = -Math.PI / 2 + (R() - 0.5) * 2.2
			const cx = Math.cos(a) * r, cz = Math.sin(a) * r
			const m = 5 + Math.floor(R() * 9)
			for (let k = 0; k < m && i < nb; k++, i++) {
				ga2.set([cx + (R() - 0.5) * 0.5, cz + (R() - 0.5) * 0.5, 0.1 + R() * 0.38, R() * 6.283], i * 4)
				gb.set([0.006 + R() * 0.006, (R() - 0.5) * 0.5, R(), R()], i * 4)
			}
		}
		g.setAttribute('ga', new THREE.InstancedBufferAttribute(ga2, 4))
		g.setAttribute('gb', new THREE.InstancedBufferAttribute(gb, 4))
		g.instanceCount = nb
		const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
			uniforms: u,
			side: THREE.DoubleSide,
			vertexShader: `${glsl}
${nois}
${rg}
attribute float kh;
attribute vec4 ga, gb;
varying vec3 vw;
varying float vk, vr;
void main() {
	vec3 b = vec3(ga.x, 0., ga.y);
	vec3 tc = normalize(vec3(cameraPosition.x - b.x, 0., cameraPosition.z - b.z));
	vec3 sd = vec3(-tc.z, 0., tc.x);
	float h = position.y * ga.z;
	float lean = gb.y + sin(ut * 1.3 + ga.w) * 0.03;
	vw = b + sd * (position.x * gb.x * 2. + lean * h * h) + vec3(0., h, 0.);
	vk = kh;
	vr = gb.z;
	gl_Position = projectionMatrix * viewMatrix * vec4(vw, 1.);
}`,
			fragmentShader: `${glsl}
${nois}
${rg}
varying vec3 vw;
varying float vk, vr;
void main() {
	float t = 0.25 + 0.35 * vk + 0.2 * vr;
	t += pow(max(dot(normalize(vw - cameraPosition), ld), 0.), 20.) * 0.6 * vk;
	float tf;
	float ff = fgt(vw, tf);
	t = mix(t, tf, ff);
	t = mix(t, hzn(atan(vw.x - cameraPosition.x, cameraPosition.z - vw.z)), rvl(vw.xz));
	gl_FragColor = vec4(dsp(rch(t)), 1.);
}`
		}))
		m.frustumCulled = false
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
			rb.set([0.22 + R() * 0.3, R(), R(), 0.7 + R() * 0.6], i * 4)
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
varying float vt, va;
varying vec2 vq;
void main() {
	vec3 wd = normalize(vec3(0.9, -ra.w, 0.35));
	vec3 o = vec3(cameraPosition.x - ${f4(bx.x / 2)}, 0., cameraPosition.z - ${f4(bx.z - 6)});
	vec3 q = ra.xyz + vec3(0.9, -ra.w, 0.35) * ut;
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
	float w = rb.w * pr * mix(1.6, 0.9, smoothstep(2., 12., dist));
	vec2 sp = mix(s0, s1, cn.x) + nm * cn.y * w * 0.5;
	vec4 cp = mix(c0, c1, cn.x);
	gl_Position = vec4(sp / (rs * 0.5) * cp.w, cp.z, cp.w);
	vec3 vd = normalize(p1 - cameraPosition);
	float fs = pow(max(dot(vd, ld), 0.), 6.);
	float I = (0.3 + 1.7 * fs) * exp(-dist / 16.) * (0.6 + 0.4 * rb.y);
	vt = mix(2.05 + 1.9 * min(I, 1.), 0.5, lt);
	va = mix(clamp(I * 1.15, 0., 0.85), 0.75 * exp(-dist / 24.), lt) * smoothstep(0., 0.4, q.y) * smoothstep(0.8, 2.5, dist);
}`,
			fragmentShader: `${glsl}
${nois}
${rg}
varying float vt, va;
varying vec2 vq;
void main() {
	float a = va * (1. - vq.y * vq.y) * mix(0.35, 1., vq.x);
	if (a < 0.004) discard;
	gl_FragColor = vec4(dsp(rch(vt)), a);
}`
		}))
		m.frustumCulled = false
		m.renderOrder = 2
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
