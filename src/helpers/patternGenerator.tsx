export const patternGenerator = () => {
    const area2RedBall = 6;
    const area2PurpleBall = 6;
    const area3RedBall = 6;
    const area3PurpleBall = 10;

    // Area 2
    var area2Pattern = [];
    const redBalls2 = Array(area2RedBall).fill("red");
    const purpleBalls2 = Array(area2PurpleBall).fill("purple");
    const balls2 = [...redBalls2, ...purpleBalls2];
    while (balls2.length > 0) {
        const randomIndex = Math.floor(Math.random() * balls2.length);
        const ball = balls2.splice(randomIndex, 1)[0];
        area2Pattern.push(ball);
    }

    area2Pattern = [
        area2Pattern.slice(0, 6),
        area2Pattern.slice(6, 12),
    ];

    // Area 3
    var area3Pattern = [];
    const redBalls3 = Array(area3RedBall).fill("red");
    const purpleBalls3 = Array(area3PurpleBall).fill("purple");
    const balls3 = [...redBalls3, ...purpleBalls3];
    while (balls3.length > 0) {
        const randomIndex = Math.floor(Math.random() * balls3.length);
        const ball = balls3.splice(randomIndex, 1)[0];
        area3Pattern.push(ball);
    }

    area3Pattern = [
        area3Pattern.slice(0, 4),
        area3Pattern.slice(4, 8),
        area3Pattern.slice(8, 12),
        area3Pattern.slice(12, 16),
    ];
    
    return [area2Pattern, area3Pattern];
}
