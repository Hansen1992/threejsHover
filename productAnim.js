import './style.scss';
import * as THREE from 'three';
import gsap from 'gsap';
import imagesLoaded from 'imagesloaded';
import FontFaceObserver from 'fontfaceobserver';
import productFragment from './shaders/productFragment.glsl';
import productVertex from './shaders/productVertex.glsl';

class Sketch {
	constructor(options) {
		this.time = 0;
		this.container = options.dom;
		this.scene = new THREE.Scene();

		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.camera = new THREE.PerspectiveCamera(
			70,
			this.width / this.height,
			100,
			2000
		);

		this.camera.position.z = 600;

		// transform webgl units to pixels
		this.camera.fov = 2 * Math.atan(this.height / 2 / 600) * (180 / Math.PI);

		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
		});

		this.container.appendChild(this.renderer.domElement);
		this.renderer.setSize(this.width, this.height);
		this.images = [...document.querySelectorAll('img')];

		// wait for the images and fonts to load, to get a smooth transition over to the webgl overlay
		const fontMontserrat = new Promise((resolve) => {
			new FontFaceObserver('Montserrat').load().then(() => {
				resolve();
			});
		});

		const fontRaleway = new Promise((resolve) => {
			new FontFaceObserver('Raleway').load().then(() => {
				resolve();
			});
		});

		const preloadImages = new Promise((resolve, reject) => {
			imagesLoaded(
				document.querySelectorAll('img'),
				{ background: true },
				resolve
			);
		});

		let allDone = [fontMontserrat, fontRaleway, preloadImages];
		this.currentScroll = 0;

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

		Promise.all(allDone).then(() => {
			this.addImages();
			this.setPosition();
			this.render();
			this.resize();
			this.mouseMovement();
			this.setupResize();
		});
	}

	mouseMovement() {
		window.addEventListener(
			'mousemove',
			(event) => {
				this.mouse.x = (event.clientX / this.width) * 2 - 1;
				this.mouse.y = -(event.clientY / this.height) * 2 + 1;

				// update the picking ray with the camera and mouse position
				this.raycaster.setFromCamera(this.mouse, this.camera);

				// calculate objects intersecting the picking ray
				const intersects = this.raycaster.intersectObjects(this.scene.children);

				if (intersects.length > 0) {
					// console.log(intersects[0]);
					let obj = intersects[0].object;
					obj.material.uniforms.hover.value = intersects[0].uv;
				}
			},
			false
		);
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this));
	}

	// resize important to scale shader geometry from units to pixels!
	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}

	addImages() {
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				time: { value: 0 },
				uImage: { value: 0 },
				hover: { value: new THREE.Vector2(0.5, 0.5) },
				hoverState: { value: 0 },
			},
			side: THREE.DoubleSide,
			fragmentShader: productFragment,
			vertexShader: productVertex,
		});

		this.materials = [];
		this.imageStore = this.images.map((img) => {
			let bounds = img.getBoundingClientRect();

			let geometry = new THREE.PlaneBufferGeometry(
				bounds.width,
				bounds.height,
				10,
				10
			);
			let texture = new THREE.Texture(img);
			texture.needsUpdate = true;

			let material = this.material.clone();

			img.addEventListener('mouseenter', () => {
				gsap.to(material.uniforms.hoverState, {
					duration: 1,
					value: 1,
				});
			});
			img.addEventListener('mouseout', () => {
				gsap.to(material.uniforms.hoverState, {
					duration: 1,
					value: 0,
				});
			});

			this.materials.push(material);

			material.uniforms.uImage.value = texture;

			let mesh = new THREE.Mesh(geometry, material);
			this.scene.add(mesh);
			return {
				img: img,
				mesh: mesh,
				top: bounds.top,
				left: bounds.left,
				width: bounds.width,
				height: bounds.height,
			};
		});
	}

	setPosition() {
		this.imageStore.forEach((o) => {
			o.mesh.position.y =
				this.currentScroll - o.top + this.height / 2 - o.height / 2;
			o.mesh.position.x = o.left - this.width / 2 + o.width / 2;
		});
	}

	render() {
		this.setPosition();

		this.materials.forEach((m) => {
			m.uniforms.time.value = this.time;
		});
		this.renderer.render(this.scene, this.camera);

		window.requestAnimationFrame(this.render.bind(this));
	}
}

new Sketch({
	dom: document.querySelector('#product-webgl'),
});

export default Sketch;
