document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化背景动画 (生成气球)
    createBalloons();

    // 2. 获取 DOM 元素
    const giftCover = document.getElementById('giftCover');
    const mainContainer = document.getElementById('mainContainer');
    const greetingSection = document.getElementById('greetingSection');
    
    const startWishBtn = document.getElementById('startWishBtn');
    
    const candleOverlay = document.getElementById('candleOverlay');
    const flame = document.getElementById('flame');
    const blowInstruction = document.getElementById('blowInstruction');
    
    const modal = document.getElementById('modal');
    
    const playVoiceBtn = document.getElementById('playVoiceBtn');
    const bgm = document.getElementById('bgm');
    const voiceBubble = document.querySelector('.voice-bubble');
    const musicControl = document.getElementById('musicControl');
    
    // 新增 DOM 元素
    const wishDisplay = document.getElementById('wishDisplay');
    const wishContent = document.getElementById('wishContent');
    const giftAlert = document.getElementById('giftAlert');
    const acceptGiftBtn = document.getElementById('acceptGiftBtn');
    const giftWaitText = document.getElementById('giftWaitText');
    const giftWaitBar = document.getElementById('giftWaitBar');
    const openingStatus = document.getElementById('openingStatus');
    const openingProgress = document.getElementById('openingProgress');
    const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.matchMedia('(max-width: 768px)').matches;
    let micCleanup = null;
    let isGiftOpening = false;
    let greetingSequenceStarted = false;
    let giftWaitTimer = null;
    let giftWaitCountdown = null;
    const celebrationMessages = [
        "愿你从今天起，天天都有小惊喜，所有努力都被温柔回应。",
        "愿你心里有光、脚下有路，所遇皆美好，所想皆成真。",
        "愿你被世界温柔偏爱，平安喜乐，闪闪发光。",
        "愿你笑容常在，梦想不晚，未来每一步都走向热爱。",
        "愿你把今天的甜，延续成往后每一天的幸福日常。",
        "愿你既有奔赴山海的勇气，也有被爱包围的底气。"
    ];

    // 3. 音乐与封面逻辑
    let musicReady = false;
    let isPlaying = false;
    
    bgm.addEventListener('error', (e) => {
        console.error("音频加载错误", e);
        musicControl.innerHTML = "❌ 音乐文件丢失";
        musicControl.classList.remove('hidden');
    });

    function applyPlayingState() {
        musicControl.classList.add('hidden');
        if (voiceBubble) {
            voiceBubble.classList.add('playing');
        }
        if (!candleOverlay.classList.contains('hidden')) {
            bgm.volume = 0.2;
        } else {
            bgm.volume = 1.0;
        }
    }

    function applyPausedState() {
        if (voiceBubble) {
            voiceBubble.classList.remove('playing');
        }
        musicControl.innerHTML = "🔊 点击开启声音";
        musicControl.classList.remove('hidden');
    }

    function updateOpeningFlow(percent, text) {
        if (openingProgress) {
            openingProgress.style.width = `${percent}%`;
        }
        if (openingStatus) {
            openingStatus.textContent = text;
        }
    }

    function revealWishButton() {
        if (!startWishBtn || !startWishBtn.classList.contains('wish-btn-hidden')) {
            return;
        }
        startWishBtn.disabled = false;
        startWishBtn.classList.remove('wish-btn-hidden');
        startWishBtn.classList.add('wish-btn-visible');
    }

    function startGreetingSequence() {
        if (greetingSequenceStarted) {
            return;
        }
        greetingSequenceStarted = true;
        greetingSection.classList.remove('greeting-pending');
        greetingSection.classList.add('greeting-playing');
        const finalGreetingLine = greetingSection.querySelector('.delay-5');
        if (finalGreetingLine) {
            finalGreetingLine.addEventListener('animationend', revealWishButton, { once: true });
            setTimeout(revealWishButton, 6200);
        } else {
            setTimeout(revealWishButton, 1200);
        }
    }

    giftCover.addEventListener('click', async () => {
        if (isGiftOpening) {
            return;
        }
        isGiftOpening = true;
        giftCover.style.pointerEvents = 'none';

        // 1. 播放音乐 (由真实用户点击触发，必然成功)
        try {
            bgm.muted = false;
            await bgm.play();
            musicReady = true;
            isPlaying = true;
            applyPlayingState();
        } catch (err) {
            console.error("音乐播放依然失败:", err);
            applyPausedState();
        }

        updateOpeningFlow(24, '正在松开丝带...');
        giftCover.classList.add('is-opening');
        giftCover.classList.add('opening');

        setTimeout(() => {
            updateOpeningFlow(56, '礼盒正在开启...');
        }, 360);

        setTimeout(() => {
            updateOpeningFlow(84, '正在装点惊喜...');
        }, 760);

        setTimeout(() => {
            updateOpeningFlow(100, '拆封完成，欢迎进入');
        }, 1080);

        setTimeout(() => {
            giftCover.classList.add('hidden');
            mainContainer.style.opacity = '1';
            mainContainer.style.pointerEvents = 'auto';
            startGreetingSequence();
        }, 1450);
    });

    bgm.addEventListener('play', () => {
        musicReady = true;
        isPlaying = true;
        bgm.muted = false;
        applyPlayingState();
    });
    
    bgm.addEventListener('pause', () => {
        isPlaying = false;
        applyPausedState();
    });

    musicControl.addEventListener('click', () => {
        if (isPlaying) {
            bgm.pause();
        } else {
            bgm.muted = false;
            bgm.play().then(() => {
                musicReady = true;
                isPlaying = true;
                applyPlayingState();
            }).catch(e => console.error("播放失败", e));
        }
    });

    // 4. 视图切换逻辑
    startWishBtn.addEventListener('click', () => {
        greetingSection.classList.remove('active');
        greetingSection.classList.add('hidden');
        if (isPlaying) {
            bgm.volume = isMobileDevice ? 0.05 : 0.2;
        }
        
        // 显示全屏覆盖层
        candleOverlay.classList.remove('hidden');
        setTimeout(() => {
            candleOverlay.classList.add('active');
            
            // 尝试启动麦克风检测 (这里会触发权限询问)
            startBlowDetection();
        }, 100);
    });

    // 6. 吹灭蜡烛逻辑
    let isCandleOut = false;

    // (A) 点击火焰熄灭 (Fallback)
    flame.addEventListener('click', () => {
        if (!isCandleOut) {
            extinguishCandle();
        }
    });

    // (B) 麦克风吹气检测
    async function startBlowDetection() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia 不可用');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 1
                },
                video: false
            });
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            analyser.smoothingTimeConstant = 0.25;
            analyser.fftSize = 2048;

            microphone.connect(analyser);
            const dataArray = new Uint8Array(analyser.fftSize);
            let frameId = 0;
            let sampleCount = 0;
            let baselineRmsSum = 0;
            let baselinePeak = 0;
            let hitCount = 0;
            const calibrationFrames = isMobileDevice ? 28 : 20;
            const requiredHits = isMobileDevice ? 2 : 3;

            micCleanup = () => {
                cancelAnimationFrame(frameId);
                microphone.disconnect();
                analyser.disconnect();
                stream.getTracks().forEach(track => track.stop());
                audioContext.close().catch(() => {});
                micCleanup = null;
            };

            const detectLoop = () => {
                if (isCandleOut) {
                    if (micCleanup) micCleanup();
                    return;
                }

                analyser.getByteTimeDomainData(dataArray);
                let sumSquares = 0;
                let peak = 0;

                for (let i = 0; i < dataArray.length; i++) {
                    const normalized = (dataArray[i] - 128) / 128;
                    const abs = Math.abs(normalized);
                    sumSquares += normalized * normalized;
                    if (abs > peak) peak = abs;
                }

                const rms = Math.sqrt(sumSquares / dataArray.length);

                if (sampleCount < calibrationFrames) {
                    baselineRmsSum += rms;
                    baselinePeak = Math.max(baselinePeak, peak);
                    sampleCount++;
                    frameId = requestAnimationFrame(detectLoop);
                    return;
                }

                const baselineRms = baselineRmsSum / calibrationFrames;
                const rmsThreshold = Math.max(isMobileDevice ? 0.04 : 0.055, baselineRms * (isMobileDevice ? 1.7 : 2.1));
                const peakThreshold = Math.max(isMobileDevice ? 0.16 : 0.22, baselinePeak * (isMobileDevice ? 1.4 : 1.8));
                const isBlowDetected = rms > rmsThreshold || peak > peakThreshold;

                if (isBlowDetected) {
                    hitCount++;
                } else {
                    hitCount = Math.max(0, hitCount - 1);
                }

                if (hitCount >= requiredHits) {
                    console.log("检测到吹气，rms:", rms.toFixed(4), "peak:", peak.toFixed(4));
                    extinguishCandle();
                    if (micCleanup) micCleanup();
                    return;
                }

                frameId = requestAnimationFrame(detectLoop);
            };

            detectLoop();
        } catch (err) {
            console.warn("麦克风不可用:", err);
            blowInstruction.innerHTML = "无法访问麦克风<br><span class='small-hint'>( 请直接点击火焰熄灭它 🔥 )</span>";
        }
    }

    function extinguishCandle() {
        if (isCandleOut) return;
        isCandleOut = true;
        if (micCleanup) micCleanup();

        // 1. 火焰熄灭动画
        flame.classList.add('extinguished');
        blowInstruction.style.opacity = '0'; 
        
        // 恢复音量
        bgm.volume = 1.0;
        // 如果之前没有在播放，尝试播放
        if (bgm.paused) {
             bgm.play().catch(e => console.log("恢复播放失败", e));
            isPlaying = true;
            if (voiceBubble) {
                voiceBubble.classList.add('playing');
            }
        }

        // 2. 环境变暗 (关灯效果)
        document.body.classList.add('dark-mode');

        // 3. 延迟后放烟花 + 弹窗
        setTimeout(() => {
            // 隐藏蜡烛层
            candleOverlay.classList.remove('active');
            setTimeout(() => { candleOverlay.classList.add('hidden'); }, 500);

            // 开始后续流程 (愿望 -> 礼物 -> 贺卡)
            startCelebration();
            
        }, 1000);
    }

    // 5. 音乐播放逻辑
    
    // Steam 兑换码复制功能
    const copyCdkeyBtn = document.getElementById('copyCdkeyBtn');
    const steamCdkey = document.getElementById('steamCdkey');
    const copyStatus = document.getElementById('copyStatus');
    
    if (copyCdkeyBtn && steamCdkey) {
        copyCdkeyBtn.addEventListener('click', () => {
            const cdkey = steamCdkey.textContent;
            navigator.clipboard.writeText(cdkey).then(() => {
                copyStatus.classList.remove('hidden');
                copyCdkeyBtn.textContent = '已复制';
                copyCdkeyBtn.style.background = '#5c7e10';
                
                setTimeout(() => {
                    copyStatus.classList.add('hidden');
                    copyCdkeyBtn.textContent = '复制';
                    copyCdkeyBtn.style.background = '';
                }, 3000);
            }).catch(err => {
                console.error('复制失败:', err);
                alert('复制失败，请手动长按选中复制');
            });
        });
    }

    function showModal() {
        modal.classList.remove('hidden');
        modal.style.opacity = '1'; // 确保弹窗显示
        // 不需要在这里强制重播，背景音乐一直在响，除非用户暂停了
        if (bgm.paused) {
             playMusic();
        }
    }

    if (playVoiceBtn) {
        playVoiceBtn.addEventListener('click', () => {
            if (isPlaying) {
                pauseMusic();
            } else {
                playMusic();
            }
        });
    }

    function playMusic() {
        bgm.currentTime = 0; // 从头播放
        bgm.play().then(() => {
            isPlaying = true;
            if (voiceBubble) {
                voiceBubble.classList.add('playing');
            }
        }).catch(error => {
            console.log("播放失败:", error);
            isPlaying = false;
            if (voiceBubble) {
                voiceBubble.classList.remove('playing');
            }
        });
    }

    function pauseMusic() {
        bgm.pause();
        isPlaying = false;
        if (voiceBubble) {
            voiceBubble.classList.remove('playing');
        }
    }

    // --- 辅助函数 ---

    function createBalloons() {
        const container = document.querySelector('.background-animation');
        container.innerHTML = '';
        const balloonCount = 15;
        const colors = ['rgba(255, 192, 203, 0.6)', 'rgba(173, 216, 230, 0.6)', 'rgba(255, 255, 224, 0.6)', 'rgba(221, 160, 221, 0.6)'];

        for (let i = 0; i < balloonCount; i++) {
            const balloon = document.createElement('div');
            balloon.classList.add('balloon');
            const left = Math.random() * 100;
            const delay = Math.random() * 15;
            const duration = 15 + Math.random() * 10;
            const color = colors[Math.floor(Math.random() * colors.length)];
            balloon.style.left = `${left}%`;
            balloon.style.animationDelay = `${delay}s`;
            balloon.style.animationDuration = `${duration}s`;
            balloon.style.background = color;
            container.appendChild(balloon);
        }
    }

    // --- 华丽烟花逻辑 (Canvas) - 已移除 ---
    /*
    const canvas = document.getElementById('fireworksCanvas');
    const ctx = canvas.getContext('2d');
    let fireworks = [];
    let particles = [];
    let isFireworksRunning = false;
    let animationId;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    // 烟花祝福文字粒子
    class TextParticle {
        // ... (TextParticle class logic)
    }
    let textParticles = [];

    class Firework {
        // ... (Firework class logic)
    }

    class Particle {
        // ... (Particle class logic)
    }

    function createParticles(x, y, hue) {
        // ...
    }
    
    function createTextFirework() {
        // ...
    }

    function drawTextFirework() {
        // ...
    }

    function loop() {
        // ...
    }

    let fireworksTimer;

    function startFireworks() {
        // ...
    }

    function stopFireworks() {
        // ...
    }
    */

    function startCelebration() {
        console.log("Start Celebration triggered");
        const randomIndex = Math.floor(Math.random() * celebrationMessages.length);
        const waitSeconds = 5;
        wishContent.textContent = celebrationMessages[randomIndex];
        wishDisplay.classList.remove('hidden');
        wishDisplay.style.opacity = '1'; // 强制显示
        if (giftWaitCountdown) clearInterval(giftWaitCountdown);
        if (giftWaitTimer) clearTimeout(giftWaitTimer);

        const revealGiftAlert = () => {
            if (!giftAlert.classList.contains('hidden')) {
                return;
            }
            if (giftWaitTimer) {
                clearTimeout(giftWaitTimer);
                giftWaitTimer = null;
            }
            console.log("Gift Alert triggering");
            giftAlert.classList.remove('hidden');
            giftAlert.style.opacity = '1';
        };

        let secondsLeft = waitSeconds;
        if (giftWaitBar) {
            giftWaitBar.style.transition = 'none';
            giftWaitBar.style.width = '0%';
            void giftWaitBar.offsetWidth;
            giftWaitBar.style.transition = `width ${waitSeconds}s linear`;
            giftWaitBar.addEventListener('transitionend', (event) => {
                if (event.propertyName === 'width') {
                    revealGiftAlert();
                }
            }, { once: true });
            requestAnimationFrame(() => {
                giftWaitBar.style.width = '100%';
            });
        }
        if (giftWaitText) {
            giftWaitText.textContent = `礼品卡正在准备中，请稍等 ${secondsLeft} 秒…`;
        }
        giftWaitCountdown = setInterval(() => {
            secondsLeft = Math.max(0, secondsLeft - 1);
            if (giftWaitText) {
                giftWaitText.textContent = secondsLeft > 0
                    ? `礼品卡正在准备中，请稍等 ${secondsLeft} 秒…`
                    : '礼品卡已送达，点击下方按钮查收吧 🎁';
            }
            if (secondsLeft === 0) {
                clearInterval(giftWaitCountdown);
                giftWaitCountdown = null;
            }
        }, 1000);
        console.log("Wish displayed");

        giftWaitTimer = setTimeout(revealGiftAlert, waitSeconds * 1000 + 250); 
    }

    // 礼物查收逻辑
    acceptGiftBtn.addEventListener('click', () => {
        giftAlert.classList.add('hidden');
        giftAlert.style.opacity = '0';
        
        // 隐藏愿望文字，显示贺卡
        wishDisplay.classList.add('hidden');
        wishDisplay.style.opacity = '0';
        if (giftWaitCountdown) {
            clearInterval(giftWaitCountdown);
            giftWaitCountdown = null;
        }
        if (giftWaitTimer) {
            clearTimeout(giftWaitTimer);
            giftWaitTimer = null;
        }
        
        showModal();
    });

    function stopFireworks() {
        // 不再强制停止，除非手动关闭
        // isFireworksRunning = false;
        // if (fireworksTimer) clearTimeout(fireworksTimer);
        // cancelAnimationFrame(animationId);
        // ctx.clearRect(0, 0, canvas.width, canvas.height);
        // fireworks = [];
        // particles = [];
        // textParticles = [];
    }
});
