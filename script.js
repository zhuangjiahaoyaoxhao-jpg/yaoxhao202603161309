document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化背景动画 (生成气球)
    createBalloons();

    // 2. 获取 DOM 元素
    const greetingSection = document.getElementById('greetingSection');
    const wishSection = document.getElementById('wishSection');
    
    const startWishBtn = document.getElementById('startWishBtn');
    const backToGreetingBtn = document.getElementById('backToGreeting');
    
    const wishBtn = document.getElementById('wishBtn');
    const wishInput = document.getElementById('wishInput');
    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close-btn');
    
    const playVoiceBtn = document.getElementById('playVoiceBtn');
    const bgm = document.getElementById('bgm');
    const voiceBubble = document.querySelector('.voice-bubble');

    // 3. 视图切换逻辑
    startWishBtn.addEventListener('click', () => {
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

    // 4. 许愿发送逻辑
    wishBtn.addEventListener('click', () => {
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

        // 直接显示成功弹窗（无需网络请求）
        showModal();
        wishInput.value = ""; // 清空输入框
    });

    // 5. 音乐播放逻辑
    let isPlaying = false;

    // 当弹窗出现时，尝试播放音乐
    function showModal() {
        modal.classList.remove('hidden');
        startFireworks(); // 开始放烟花
        
        // 尝试自动播放音乐
        playMusic();
    }

    // 点击语音条控制播放/暂停
    playVoiceBtn.addEventListener('click', () => {
        if (isPlaying) {
            pauseMusic();
        } else {
            playMusic();
        }
    });

    function playMusic() {
        bgm.play().then(() => {
            isPlaying = true;
            voiceBubble.classList.add('playing');
        }).catch(error => {
            console.log("自动播放被浏览器拦截，需要用户点击:", error);
            // 如果自动播放失败，状态保持为暂停
            isPlaying = false;
            voiceBubble.classList.remove('playing');
        });
    }

    function pauseMusic() {
        bgm.pause();
        isPlaying = false;
        voiceBubble.classList.remove('playing');
    }

    // 6. 关闭弹窗事件
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        pauseMusic(); // 关闭弹窗时停止音乐
        stopFireworks(); // 停止烟花
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            pauseMusic();
            stopFireworks();
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

    // --- 烟花逻辑 (Canvas) ---
    const canvas = document.getElementById('fireworksCanvas');
    const ctx = canvas.getContext('2d');
    let fireworks = [];
    let particles = [];
    let animationId;
    let isFireworksRunning = false;

    // 调整画布大小
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    // 烟花发射点类
    class Firework {
        constructor(sx, sy, tx, ty) {
            this.x = sx;
            this.y = sy;
            this.sx = sx;
            this.sy = sy;
            this.tx = tx;
            this.ty = ty;
            this.distanceToTarget = Math.sqrt(Math.pow(tx - sx, 2) + Math.pow(ty - sy, 2));
            this.distanceTraveled = 0;
            this.coordinates = [];
            this.coordinateCount = 3;
            while (this.coordinateCount--) {
                this.coordinates.push([this.x, this.y]);
            }
            this.angle = Math.atan2(ty - sy, tx - sx);
            this.speed = 2;
            this.acceleration = 1.05;
            this.brightness = random(50, 70);
            this.targetRadius = 1;
        }

        update(index) {
            this.coordinates.pop();
            this.coordinates.unshift([this.x, this.y]);

            if (this.targetRadius < 8) {
                this.targetRadius += 0.3;
            } else {
                this.targetRadius = 1;
            }

            this.speed *= this.acceleration;
            const vx = Math.cos(this.angle) * this.speed;
            const vy = Math.sin(this.angle) * this.speed;
            this.distanceTraveled = Math.sqrt(Math.pow(this.sx - this.x, 2) + Math.pow(this.sy - this.y, 2));

            if (this.distanceTraveled >= this.distanceToTarget) {
                createParticles(this.tx, this.ty);
                fireworks.splice(index, 1);
            } else {
                this.x += vx;
                this.y += vy;
            }
        }

        draw() {
            ctx.beginPath();
            ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
            ctx.lineTo(this.x, this.y);
            ctx.strokeStyle = 'hsl(' + random(0, 360) + ', 100%, ' + this.brightness + '%)';
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(this.tx, this.ty, this.targetRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // 爆炸粒子类
    class Particle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.coordinates = [];
            this.coordinateCount = 5;
            while (this.coordinateCount--) {
                this.coordinates.push([this.x, this.y]);
            }
            this.angle = random(0, Math.PI * 2);
            this.speed = random(1, 10);
            this.friction = 0.95;
            this.gravity = 1;
            this.hue = random(0, 360);
            this.brightness = random(50, 80);
            this.alpha = 1;
            this.decay = random(0.015, 0.03);
        }

        update(index) {
            this.coordinates.pop();
            this.coordinates.unshift([this.x, this.y]);
            this.speed *= this.friction;
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed + this.gravity;
            this.alpha -= this.decay;

            if (this.alpha <= this.decay) {
                particles.splice(index, 1);
            }
        }

        draw() {
            ctx.beginPath();
            ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
            ctx.lineTo(this.x, this.y);
            ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
            ctx.stroke();
        }
    }

    function createParticles(x, y) {
        let particleCount = 30;
        while (particleCount--) {
            particles.push(new Particle(x, y));
        }
    }

    function loop() {
        if (!isFireworksRunning) return;
        
        requestAnimationFrame(loop);
        
        // 拖尾效果
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'lighter';

        let i = fireworks.length;
        while (i--) {
            fireworks[i].draw();
            fireworks[i].update(i);
        }

        let j = particles.length;
        while (j--) {
            particles[j].draw();
            particles[j].update(j);
        }

        // 随机自动发射烟花
        if (Math.random() < 0.05) { // 频率
            fireworks.push(new Firework(canvas.width / 2, canvas.height, random(0, canvas.width), random(0, canvas.height / 2)));
        }
    }

    function startFireworks() {
        if (isFireworksRunning) return;
        isFireworksRunning = true;
        loop();
    }

    function stopFireworks() {
        isFireworksRunning = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height); // 清空画布
        fireworks = [];
        particles = [];
    }
});
