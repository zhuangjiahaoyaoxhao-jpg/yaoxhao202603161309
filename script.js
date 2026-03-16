document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化背景动画 (生成气球)
    createBalloons();

    // 2. 获取 DOM 元素
    const greetingSection = document.getElementById('greetingSection');
    const wishSection = document.getElementById('wishSection');
    
    const startWishBtn = document.getElementById('startWishBtn');
    const backToGreetingBtn = document.getElementById('backToGreeting');
    
    const readyToBlowBtn = document.getElementById('readyToBlowBtn'); 
    const wishInput = document.getElementById('wishInput');
    
    const candleOverlay = document.getElementById('candleOverlay');
    const flame = document.getElementById('flame');
    const blowInstruction = document.getElementById('blowInstruction');
    
    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close-btn');
    
    const playVoiceBtn = document.getElementById('playVoiceBtn');
    const bgm = document.getElementById('bgm');
    const voiceBubble = document.querySelector('.voice-bubble');
    const musicControl = document.getElementById('musicControl');
    
    // 新增 DOM 元素
    const wishDisplay = document.getElementById('wishDisplay');
    const wishContent = document.getElementById('wishContent');
    const giftAlert = document.getElementById('giftAlert');
    const acceptGiftBtn = document.getElementById('acceptGiftBtn');

    // 3. 音乐预加载与控制
    let musicReady = false;
    
    // 监听音频加载错误
    bgm.addEventListener('error', (e) => {
        console.error("音频加载错误", e);
        musicControl.innerHTML = "❌ 音乐文件丢失 (birthday.mp3)";
        musicControl.classList.remove('hidden');
        musicControl.style.animation = "none";
        musicControl.style.background = "#ffcccc";
    });

    function initMusic() {
        if (!musicReady) {
            bgm.load();
            bgm.play().then(() => {
                musicReady = true;
                musicControl.classList.add('hidden');
                console.log("音乐已就绪，开始播放");
                
                // 标记为正在播放
                isPlaying = true;
                voiceBubble.classList.add('playing');

                // 特殊情况：如果当前正好在吹蜡烛界面（理论上不太可能，除非直接跳过），则降低音量
                if (!candleOverlay.classList.contains('hidden')) {
                    bgm.volume = 0.2;
                } else {
                    bgm.volume = 1.0;
                }
            }).catch(e => {
                console.log("自动播放被阻止，显示手动播放按钮", e);
                musicControl.classList.remove('hidden');
            });
        }
    }

    // 监听任意交互事件来初始化音乐 (尽可能早地触发)
    const interactionEvents = ['click', 'touchstart', 'scroll', 'mousemove', 'keydown'];
    interactionEvents.forEach(event => {
        document.body.addEventListener(event, initMusic, { once: true });
    });

    // 尝试在页面加载完成后立即自动播放
    setTimeout(() => {
        initMusic();
    }, 500);

    musicControl.addEventListener('click', () => {
        if (isPlaying) {
            bgm.pause();
            isPlaying = false;
            voiceBubble.classList.remove('playing');
            musicControl.innerHTML = "🔇 点击开启音乐";
        } else {
            bgm.play().then(() => {
                musicReady = true;
                isPlaying = true;
                voiceBubble.classList.add('playing');
                musicControl.classList.add('hidden');
            }).catch(e => console.error("播放失败", e));
        }
    });

    // 4. 视图切换逻辑
    startWishBtn.addEventListener('click', () => {
        // 移除这里的麦克风权限预授权，根据用户反馈
        /*
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
             stream.getTracks().forEach(track => track.stop());
             console.log("麦克风权限已预授权");
        }).catch(err => {
             console.warn("麦克风预授权失败:", err);
             blowInstruction.innerHTML = "麦克风未授权<br><span class='small-hint'>( 请直接点击火焰熄灭它 🔥 )</span>";
        });
        */

        greetingSection.classList.remove('active');
        greetingSection.classList.add('hidden');
        setTimeout(() => {
            wishSection.classList.remove('hidden');
            wishSection.classList.add('active');
        }, 300);
    });

    backToGreetingBtn.addEventListener('click', () => {
        wishSection.classList.remove('active');
        wishSection.classList.add('hidden');
        setTimeout(() => {
            greetingSection.classList.remove('hidden');
            greetingSection.classList.add('active');
        }, 300);
    });

    // 5. 许愿 -> 吹蜡烛 逻辑
    readyToBlowBtn.addEventListener('click', () => {
        const wishText = wishInput.value.trim();

        if (wishText === "") {
            wishInput.style.borderColor = "red";
            wishInput.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(0)' }
            ], { duration: 300, iterations: 1 });
            setTimeout(() => { wishInput.style.borderColor = "#eee"; }, 1000);
            return;
        }

        // 隐藏许愿卡，显示吹蜡烛界面
        wishSection.classList.remove('active');
        wishSection.classList.add('hidden');
        
        // 降低音量，以免干扰麦克风检测，同时营造氛围
        if (isPlaying) {
            bgm.volume = 0.2; // 降低到 20%
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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

            analyser.smoothingTimeConstant = 0.8;
            analyser.fftSize = 1024;

            microphone.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);

            scriptProcessor.onaudioprocess = function() {
                if (isCandleOut) return; 

                const array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                
                let values = 0;
                const length = array.length;
                for (let i = 0; i < length; i++) {
                    values += array[i];
                }
                const average = values / length;

                // 由于背景音乐存在，稍微提高一点检测阈值，避免误触发
                if (average > 55) { // 原为 45，适当提高
                    console.log("检测到吹气，音量:", average);
                    extinguishCandle();
                    scriptProcessor.disconnect();
                    analyser.disconnect();
                    microphone.disconnect();
                    stream.getTracks().forEach(track => track.stop());
                }
            };
        } catch (err) {
            console.warn("麦克风不可用:", err);
            blowInstruction.innerHTML = "无法访问麦克风<br><span class='small-hint'>( 请直接点击火焰熄灭它 🔥 )</span>";
        }
    }

    function extinguishCandle() {
        if (isCandleOut) return;
        isCandleOut = true;

        // 1. 火焰熄灭动画
        flame.classList.add('extinguished');
        blowInstruction.style.opacity = '0'; 
        
        // 恢复音量
        bgm.volume = 1.0;
        // 如果之前没有在播放，尝试播放
        if (bgm.paused) {
             bgm.play().catch(e => console.log("恢复播放失败", e));
             isPlaying = true;
             voiceBubble.classList.add('playing');
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

    // 7. 音乐播放逻辑
    let isPlaying = false;

    function showModal() {
        modal.classList.remove('hidden');
        modal.style.opacity = '1'; // 确保弹窗显示
        // 不需要在这里强制重播，背景音乐一直在响，除非用户暂停了
        if (bgm.paused) {
             playMusic();
        }
    }

    playVoiceBtn.addEventListener('click', () => {
        if (isPlaying) {
            pauseMusic();
        } else {
            playMusic();
        }
    });

    function playMusic() {
        bgm.currentTime = 0; // 从头播放
        bgm.play().then(() => {
            isPlaying = true;
            voiceBubble.classList.add('playing');
        }).catch(error => {
            console.log("播放失败:", error);
            isPlaying = false;
            voiceBubble.classList.remove('playing');
        });
    }

    function pauseMusic() {
        bgm.pause();
        isPlaying = false;
        voiceBubble.classList.remove('playing');
    }

    // 8. 关闭弹窗事件
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.style.opacity = '0';
        pauseMusic();
        
        // 恢复页面
        document.body.classList.remove('dark-mode');
        document.querySelector('.container').style.opacity = '1';
        document.querySelector('.background-animation').style.opacity = '1';
        // 重置状态
        isCandleOut = false;
        flame.classList.remove('extinguished');
        blowInstruction.style.opacity = '1';
        greetingSection.classList.remove('hidden');
        greetingSection.classList.add('active');
        
        // 隐藏愿望和礼物
        wishDisplay.classList.add('hidden');
        wishDisplay.style.opacity = '0';
        giftAlert.classList.add('hidden');
        giftAlert.style.opacity = '0';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            // 同上
            modal.classList.add('hidden');
            modal.style.opacity = '0';
            pauseMusic();
            document.body.classList.remove('dark-mode');
            isCandleOut = false;
            flame.classList.remove('extinguished');
            blowInstruction.style.opacity = '1';
            greetingSection.classList.remove('hidden');
            greetingSection.classList.add('active');
            
             // 隐藏愿望和礼物
            wishDisplay.classList.add('hidden');
            wishDisplay.style.opacity = '0';
            giftAlert.classList.add('hidden');
            giftAlert.style.opacity = '0';
        }
    });

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
        // 显示用户愿望
        wishContent.textContent = wishInput.value.trim() || "愿望一定会实现";
        wishDisplay.classList.remove('hidden');
        wishDisplay.style.opacity = '1'; // 强制显示
        console.log("Wish displayed");

        // 5秒后显示礼物提醒
        setTimeout(() => {
            console.log("Gift Alert triggering");
            giftAlert.classList.remove('hidden');
            giftAlert.style.opacity = '1'; // 强制显示
        }, 5000); 
    }

    // 礼物查收逻辑
    acceptGiftBtn.addEventListener('click', () => {
        giftAlert.classList.add('hidden');
        giftAlert.style.opacity = '0';
        
        // 隐藏愿望文字，显示贺卡
        wishDisplay.classList.add('hidden');
        wishDisplay.style.opacity = '0';
        
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
