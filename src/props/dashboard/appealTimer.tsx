'use client'

import { Box, Button, Text } from "@chakra-ui/react";
import "@fontsource-variable/quicksand";
import { useEffect, useRef, useState } from "react";

export default function AppealTimer({ onClose }: { onClose?: () => void }) {
    const [timeLeft, setTimeLeft] = useState(60); // 60 seconds
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const countdownAudioRef = useRef<HTMLAudioElement | null>(null);
    const appealStartAudioRef = useRef<HTMLAudioElement | null>(null);
    const appealEndAudioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio
    useEffect(() => {
        countdownAudioRef.current = new Audio("/sound/countdown.mp3");
        appealStartAudioRef.current = new Audio("/sound/appealStart.mp3");
        appealEndAudioRef.current = new Audio("/sound/appealEnd.mp3");
        return () => {
            if (countdownAudioRef.current) {
                countdownAudioRef.current.pause();
                countdownAudioRef.current = null;
            }
        };
    }, []);

    // Countdown logic
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    const newTime = prev - 1;

                    // Play sound for last 4 seconds
                    if (newTime <= 3 && newTime > 0 && countdownAudioRef.current) {
                        if (countdownAudioRef.current.paused) {
                            countdownAudioRef.current.play().catch(() => {
                                // Ignore autoplay errors
                            });
                        }
                    }

                    if (newTime <= 0) {
                        setIsRunning(false);
                        if (appealEndAudioRef.current) {
                            appealEndAudioRef.current.play().catch(() => {
                                // Ignore autoplay errors
                            });
                        }
                        return 0;
                    }

                    return newTime;
                });
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, timeLeft]);

    const startTimer = () => {
        if (appealStartAudioRef.current) {
            appealStartAudioRef.current.play().catch(() => {
                // Ignore autoplay errors   
            });
        }
        setTimeLeft(60);
        setIsRunning(true);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(60);
        if (countdownAudioRef.current) {
            countdownAudioRef.current.pause();
            countdownAudioRef.current.currentTime = 0;
        }
    };

    const pauseTimer = () => {
        setIsRunning(false);
    };

    // Calculate progress percentage for circular timer
    const progress = (60 - timeLeft) / 60;
    const radius = 200; // Increased radius for bigger circle
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <Box
            style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem',
                fontFamily: "'Quicksand Variable', sans-serif",
                color: 'white',
            }}
        >

            {/* Circular Timer */}
            <Box
                position="relative"
                width="500px"
                height="500px"
                display="flex"
                justifyContent="center"
                alignItems="center"
            >
                {/* SVG Circle Background */}
                <svg
                    width="500"
                    height="500"
                    style={{
                        transform: 'rotate(-90deg)',
                        position: 'absolute',
                    }}
                >
                    {/* Background Circle */}
                    <circle
                        cx="250"
                        cy="250"
                        r="200"
                        fill="none"
                        stroke="#4A4A4A"
                        strokeWidth="30"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx="250"
                        cy="250"
                        r="200"
                        fill="none"
                        stroke={timeLeft <= 10 ? "#FF4444" : "#4CAF50"}
                        strokeWidth="30"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{
                            transition: 'stroke-dashoffset 0.5s ease',
                        }}
                    />
                </svg>

                {/* Timer Text */}
                <Box
                    position="relative"
                    zIndex={2}
                    textAlign="center"
                >
                    <Text
                        fontSize="10rem"
                        fontWeight="700"
                        lineHeight="1"
                        color={timeLeft <= 10 ? "#FF4444" : "white"}
                    >
                        {timeLeft}
                    </Text>
                    <Text
                        fontSize="2.5rem"
                        fontWeight="500"
                        mt="1rem"
                        opacity={0.8}
                    >
                        Seconds
                    </Text>
                </Box>
            </Box>

            {/* Control Buttons */}
            <Box
                mt="3rem"
                display="flex"
                gap="1rem"
            >
                {!isRunning ? (
                    <Button
                        onClick={startTimer}
                        colorScheme="green"
                        size="lg"
                        fontSize="1.2rem"
                        px="3rem"
                    >
                        Start Appeal Period
                    </Button>
                ) : (
                    <Button
                        onClick={pauseTimer}
                        colorScheme="orange"
                        size="lg"
                        fontSize="1.2rem"
                        px="3rem"
                    >
                        Pause
                    </Button>
                )}
                <Button
                    onClick={resetTimer}
                    colorScheme="red"
                    size="lg"
                    fontSize="1.2rem"
                    px="3rem"
                >
                    Reset
                </Button>
            </Box>
        </Box>
    );
}

