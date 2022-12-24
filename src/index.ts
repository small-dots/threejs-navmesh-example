import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Pathfinding } from 'three-pathfinding';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 5;
camera.position.z = 10;
camera.position.x = -13;

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true

// ORBIT CAMERA CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true
orbitControls.enablePan = true
orbitControls.minDistance = 5
orbitControls.maxDistance = 30
// orbitControls.maxPolarAngle = Math.PI / 2 - 0.05 // prevent camera below ground
// orbitControls.minPolarAngle = Math.PI / 4        // prevent top down view
orbitControls.update();

const dLight = new THREE.DirectionalLight('white', 0.6);
dLight.position.x = 20;
dLight.position.y = 30;
dLight.castShadow = true;
dLight.shadow.mapSize.width = 4096;
dLight.shadow.mapSize.height = 4096;
const d = 35;
dLight.shadow.camera.left = - d;
dLight.shadow.camera.right = d;
dLight.shadow.camera.top = d;
dLight.shadow.camera.bottom = - d;
scene.add(dLight);

const aLight = new THREE.AmbientLight('white', 0.4);
scene.add(aLight);

// ANIMATE
document.body.appendChild(renderer.domElement);

// RESIZE HANDLER
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

const agentHeight = 1.0;
const agentRadius = 0.25;
const agentYOffset = agentHeight / 2;
const agent = new THREE.Mesh(new THREE.CylinderGeometry(agentRadius, agentRadius, agentHeight), new THREE.MeshPhongMaterial({ color: 'green'}));
agent.position.z = -4;
agent.position.x = -4;
agent.position.y = 0.21403926610946655 + agentYOffset;
scene.add(agent);

const loader = new GLTFLoader();
loader.load('./glb/demo-level.glb', (gltf: GLTF) => {
    scene.add(gltf.scene);
});


const pathfinding = new Pathfinding();
const ZONE = 'level1';
let navmesh;
let groupID;
let navpath;
loader.load('./glb/demo-level-navmesh.glb', (gltf: GLTF) => {
    // scene.add(gltf.scene);
    gltf.scene.traverse((node) => {
        if (!navmesh && node.isObject3D && node.children && node.children.length > 0) {
            navmesh = node.children[0];
            pathfinding.setZoneData(ZONE, Pathfinding.createZone(navmesh.geometry));
            groupID = pathfinding.getGroup(ZONE, agent.position);
        }
    });
});

// RAYCASTING
const raycaster = new THREE.Raycaster(); // create once
const clickMouse = new THREE.Vector2();  // create once
let target: THREE.Vector3 = null;
let threePath: THREE.Line = null;

function intersect(pos: THREE.Vector2) {
    raycaster.setFromCamera(pos, camera);
    return raycaster.intersectObjects(scene.children);
}

window.addEventListener('click', event => {
    // THREE RAYCASTER
    clickMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    clickMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
    const found = intersect(clickMouse);
    if (found.length > 0) {
        target = found[0].point;
        console.log(`click point: ${JSON.stringify(target)}`);
        navpath = navpath = pathfinding.findPath(agent.position, target, ZONE, groupID);
        if (navpath) {
            drawLine(navpath);
        }
    }
})

function drawLine(navpath: THREE.Vector3[]) {
    if (threePath) {
        threePath.removeFromParent();
    }
    let points: THREE.Vector3[] = [];
    points.push(agent.position);
    points = points.concat(navpath.map(p => new THREE.Vector3(p.x, p.y + agentYOffset, p.z)));

    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    const material = new THREE.LineBasicMaterial({
        color: 0x55aaff
    });
    threePath = new THREE.Line( geometry, material );
    scene.add( threePath );
}

let gameLoop = () => {
    orbitControls.update()
    renderer.render(scene, camera);
    setTimeout(gameLoop, 16);
};
gameLoop();