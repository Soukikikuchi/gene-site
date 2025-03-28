// Three.jsのインポート
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// グローバル変数
let scene, camera, renderer, controls;
let dnaModel, virusModel, cellModel;
let animationMixer;
let clock = new THREE.Clock();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let selectedModel = null;
let modelInfo = {
    dna: {
        title: "DNA二重らせん",
        description: "遺伝子療法の標的となる遺伝情報を担う分子構造です。特定の遺伝子を修正または置換することで、疾患の治療を行います。"
    },
    virus: {
        title: "ウイルスベクター",
        description: "治療用遺伝子を細胞内に運ぶための「運び屋」として使用されます。ウイルスの感染能力を利用して、治療用遺伝子を効率的に標的細胞に導入します。"
    },
    cell: {
        title: "標的細胞",
        description: "遺伝子療法の対象となる細胞です。ウイルスベクターによって導入された治療用遺伝子が、細胞内で機能することで治療効果を発揮します。"
    }
};

// 初期化関数
function init() {
    // シーンの作成
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000814);
    
    // カメラの設定
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);
    
    // レンダラーの設定
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    
    // キャンバスをDOMに追加
    const container = document.getElementById('canvas-container');
    container.appendChild(renderer.domElement);
    
    // コントロールの設定
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2;
    
    // 光源の追加
    addLights();
    
    // 3Dモデルの作成
    createDNAModel();
    createVirusModel();
    createCellModel();
    
    // ウィンドウリサイズイベントの設定
    window.addEventListener('resize', onWindowResize);
    
    // マウスイベントの設定
    container.addEventListener('click', onMouseClick);
    container.addEventListener('mousemove', onMouseMove);
    
    // 情報パネルの作成
    createInfoPanel();
    
    // アニメーションの開始
    animate();
}

// 情報パネルの作成
function createInfoPanel() {
    const infoPanel = document.createElement('div');
    infoPanel.id = 'info-panel';
    infoPanel.innerHTML = `
        <div class="info-content">
            <h3>モデルをクリックして詳細を表示</h3>
            <p>3Dモデルを操作するには：</p>
            <ul>
                <li>回転: マウスドラッグ</li>
                <li>ズーム: スクロールホイール</li>
                <li>移動: 右クリックドラッグ</li>
            </ul>
        </div>
    `;
    infoPanel.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 20px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 15px;
        border-radius: 8px;
        max-width: 300px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        z-index: 100;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    document.getElementById('canvas-container').appendChild(infoPanel);
    
    // 初期表示
    setTimeout(() => {
        infoPanel.style.opacity = '1';
    }, 1000);
}

// 情報パネルの更新
function updateInfoPanel(modelType) {
    const infoPanel = document.getElementById('info-panel');
    if (!infoPanel) return;
    
    const info = modelInfo[modelType];
    if (!info) return;
    
    infoPanel.innerHTML = `
        <div class="info-content">
            <h3>${info.title}</h3>
            <p>${info.description}</p>
        </div>
    `;
    
    // パネルを表示
    infoPanel.style.opacity = '1';
}

// マウスクリックイベントの処理
function onMouseClick(event) {
    // マウス位置を正規化
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    
    // レイキャスティング
    raycaster.setFromCamera(mouse, camera);
    
    // 交差判定
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
        // クリックされたオブジェクトの親を特定
        let parent = intersects[0].object;
        while (parent.parent && parent !== scene) {
            if (parent === dnaModel) {
                selectedModel = 'dna';
                updateInfoPanel('dna');
                highlightModel(dnaModel);
                break;
            } else if (parent === virusModel) {
                selectedModel = 'virus';
                updateInfoPanel('virus');
                highlightModel(virusModel);
                break;
            } else if (parent === cellModel) {
                selectedModel = 'cell';
                updateInfoPanel('cell');
                highlightModel(cellModel);
                break;
            }
            parent = parent.parent;
        }
    }
}

// マウス移動イベントの処理
function onMouseMove(event) {
    // マウス位置を正規化
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    
    // レイキャスティング
    raycaster.setFromCamera(mouse, camera);
    
    // 交差判定
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // カーソルスタイルの変更
    document.body.style.cursor = intersects.length > 0 ? 'pointer' : 'auto';
}

// モデルのハイライト
function highlightModel(model) {
    // 全てのモデルを元の位置に戻す
    resetModelPositions();
    
    // 選択されたモデルを前に出す
    if (model === dnaModel) {
        model.position.z = 2;
    } else if (model === virusModel) {
        model.position.z = 2;
    } else if (model === cellModel) {
        model.position.z = 2;
    }
    
    // ハイライトエフェクト（輝き）を追加
    const glow = new THREE.PointLight(0xffffff, 1, 10);
    glow.name = 'highlight-light';
    model.add(glow);
    
    // 他のモデルを暗くする
    scene.children.forEach(child => {
        if (child !== model && (child === dnaModel || child === virusModel || child === cellModel)) {
            child.traverse(object => {
                if (object.isMesh) {
                    object.material.opacity = 0.3;
                    object.material.transparent = true;
                }
            });
        }
    });
}

// モデル位置のリセット
function resetModelPositions() {
    // DNAモデル
    dnaModel.position.set(-5, 0, 0);
    
    // ウイルスモデル
    virusModel.position.set(5, 0, 0);
    
    // 細胞モデル
    cellModel.position.set(0, -5, 0);
    
    // ハイライトの削除
    scene.traverse(object => {
        if (object.name === 'highlight-light') {
            object.parent.remove(object);
        }
    });
    
    // 透明度をリセット
    scene.children.forEach(child => {
        if (child === dnaModel || child === virusModel || child === cellModel) {
            child.traverse(object => {
                if (object.isMesh) {
                    object.material.opacity = 1.0;
                }
            });
        }
    });
}

// 光源の追加関数
function addLights() {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // ディレクショナルライト（太陽光のような平行光源）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // スポットライト（DNAモデルを強調）
    const spotLight = new THREE.SpotLight(0x3498db, 1);
    spotLight.position.set(0, 10, 0);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.2;
    spotLight.decay = 2;
    spotLight.distance = 50;
    spotLight.castShadow = true;
    scene.add(spotLight);
}

// DNAモデルの作成関数
function createDNAModel() {
    // DNAの二重らせん構造を作成
    dnaModel = new THREE.Group();
    
    // DNAの骨格（二本のらせん）
    const backboneMaterial = new THREE.MeshPhongMaterial({ color: 0x3498db, shininess: 100 });
    const backboneGeometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(createHelixPoints(0, 0, 0, 10, 1, 0)), 
        100, 0.2, 8, false
    );
    const backbone1 = new THREE.Mesh(backboneGeometry, backboneMaterial);
    
    const backbone2Material = new THREE.MeshPhongMaterial({ color: 0xe74c3c, shininess: 100 });
    const backbone2Geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(createHelixPoints(0, 0, 0, 10, 1, Math.PI)), 
        100, 0.2, 8, false
    );
    const backbone2 = new THREE.Mesh(backbone2Geometry, backbone2Material);
    
    dnaModel.add(backbone1);
    dnaModel.add(backbone2);
    
    // 塩基対（らせんをつなぐ棒）を追加
    const basePairMaterial = new THREE.MeshPhongMaterial({ color: 0xf1c40f, shininess: 100 });
    
    for (let i = 0; i < 20; i++) {
        const height = i * 0.5 - 5;
        const basePairGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
        const basePair = new THREE.Mesh(basePairGeometry, basePairMaterial);
        basePair.position.y = height;
        basePair.rotation.z = i * (Math.PI / 10);
        dnaModel.add(basePair);
    }
    
    // シーンに追加
    dnaModel.position.set(-5, 0, 0);
    scene.add(dnaModel);
}

// らせん状の点を生成する関数
function createHelixPoints(x, y, z, height, radius, phaseShift) {
    const points = [];
    const turns = 4; // らせんの巻き数
    const pointsPerTurn = 30; // 1巻きあたりの点の数
    
    for (let i = 0; i <= turns * pointsPerTurn; i++) {
        const angle = (i / pointsPerTurn) * Math.PI * 2 + phaseShift;
        const pointHeight = (i / (turns * pointsPerTurn)) * height - height / 2;
        
        points.push(new THREE.Vector3(
            x + Math.cos(angle) * radius,
            y + pointHeight,
            z + Math.sin(angle) * radius
        ));
    }
    
    return points;
}

// ウイルスベクターモデルの作成関数
function createVirusModel() {
    virusModel = new THREE.Group();
    
    // ウイルスの本体（球体）
    const virusBodyGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const virusBodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2ecc71, 
        shininess: 30,
        transparent: true,
        opacity: 0.8
    });
    const virusBody = new THREE.Mesh(virusBodyGeometry, virusBodyMaterial);
    virusModel.add(virusBody);
    
    // ウイルスの表面タンパク質（スパイク）
    const spikeMaterial = new THREE.MeshPhongMaterial({ color: 0xe74c3c });
    
    for (let i = 0; i < 30; i++) {
        const spikeGeometry = new THREE.ConeGeometry(0.2, 0.8, 8);
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        
        // 球面上にランダムに配置
        const phi = Math.acos(-1 + (2 * i) / 30);
        const theta = Math.sqrt(30 * Math.PI) * phi;
        
        spike.position.setFromSphericalCoords(1.5, phi, theta);
        spike.lookAt(0, 0, 0);
        spike.rotateX(Math.PI / 2);
        
        virusModel.add(spike);
    }
    
    // シーンに追加
    virusModel.position.set(5, 0, 0);
    scene.add(virusModel);
}

// 細胞モデルの作成関数
function createCellModel() {
    cellModel = new THREE.Group();
    
    // 細胞膜（球体）
    const cellMembraneGeometry = new THREE.SphereGeometry(2, 32, 32);
    const cellMembraneMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x9b59b6, 
        transparent: true, 
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const cellMembrane = new THREE.Mesh(cellMembraneGeometry, cellMembraneMaterial);
    cellModel.add(cellMembrane);
    
    // 細胞核
    const nucleusGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const nucleusMaterial = new THREE.MeshPhongMaterial({ color: 0x3498db });
    const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    cellModel.add(nucleus);
    
    // 細胞質内のオルガネラ
    const organelleMaterial = new THREE.MeshPhongMaterial({ color: 0xf1c40f });
    
    for (let i = 0; i < 10; i++) {
        const size = 0.1 + Math.random() * 0.2;
        const organelleGeometry = new THREE.SphereGeometry(size, 16, 16);
        const organelle = new THREE.Mesh(organelleGeometry, organelleMaterial);
        
        // 細胞内にランダムに配置（核を避ける）
        const radius = 0.8 + Math.random() * 0.8;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        organelle.position.setFromSphericalCoords(radius, phi, theta);
        cellModel.add(organelle);
    }
    
    // シーンに追加
    cellModel.position.set(0, -5, 0);
    scene.add(cellModel);
}

// ウィンドウリサイズ時の処理
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// アニメーション関数
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // DNAモデルの回転
    if (dnaModel) {
        dnaModel.rotation.y += 0.005;
    }
    
    // ウイルスモデルの回転
    if (virusModel) {
        virusModel.rotation.y -= 0.007;
        virusModel.rotation.x += 0.003;
    }
    
    // 細胞モデルの回転
    if (cellModel) {
        cellModel.rotation.y += 0.003;
    }
    
    // コントロールの更新
    controls.update();
    
    // レンダリング
    renderer.render(scene, camera);
}

// スクロールイベントの処理
function handleScroll() {
    const scrollY = window.scrollY;
    
    // スクロールに応じてカメラの位置を変更
    if (scrollY < window.innerHeight) {
        const progress = scrollY / window.innerHeight;
        camera.position.y = 5 - progress * 10;
        camera.lookAt(0, 0, 0);
    }
}

// スクロールイベントリスナーの追加
window.addEventListener('scroll', handleScroll);

// ページ読み込み時に初期化
window.addEventListener('load', init);
