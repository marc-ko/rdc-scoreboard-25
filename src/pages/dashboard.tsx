'use client'

import { GAME_STAGES, GAME_STAGES_TIME } from "@/common/gameStages";
import { patternGenerator } from "@/helpers/patternGenerator";
import { Counter } from "@/props/dashboard/Counter";
import { CounterType } from "@/props/dashboard/CounterType";
import HistoryList from "@/props/dashboard/HistoryList";
import { ScoreDisplay } from "@/props/dashboard/ScoreDisplay";
import TimerBox from "@/props/dashboard/TimerBox";
import { YJsClient } from "@/yjsClient/yjsClient";
import { Box, Button, Flex, Image, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Switch, Text, useToast } from "@chakra-ui/react";
import "@fontsource-variable/quicksand";
import Head from 'next/head';
import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import Teams from "../props/dashboard/teams.json";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleDot } from '@fortawesome/free-solid-svg-icons';
import AppealTimer from '../props/dashboard/appealTimer';
import TextHint from "@/props/dashboard/TextHint";


export default function Dashboard(props: any) {

    // [Sys] Initiate Components
    const toast = useToast();

    // [Sys] ContinerHeight Helper Functions and States
    const [containerHeight, setContainerHeight] = useState(0);
    const heightEventListner = useRef(false);

    useEffect(() => {
        if (!heightEventListner.current) {
            const handleResize = () => {
                setContainerHeight(window.innerHeight);
            }
            handleResize();
            window.addEventListener('resize', handleResize);
            heightEventListner.current = true;
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [])


    // [Core] GameID Functions and States
    const [gameID, setGameID] = useState("");
    const [gameIDModal, setGameIDModal] = useState(true);
    const gameIDInput = useRef<HTMLInputElement>(null);
    const [ydoc, setYDoc] = useState<Y.Doc>(new Y.Doc());
    const [onlineStatus, setOnlineStatus] = useState(0);

    const submitGameID = (gameID?: string) => {
        if (gameID) {
            const yJsClient = new YJsClient(gameID);
            setGameID(gameID);
            setYDoc(yJsClient.getYDoc());
            setClockData(yJsClient.getYDoc().getMap("clockData") as Y.Map<any>);
            setGameProps(yJsClient.getYDoc().getMap("gameProps") as Y.Map<any>);
            setGameIDModal(false);
            yJsClient.getYPartyProvider().on("status", connectionEventHandler);
        }
    }

    const connectionEventHandler = (event: any) => {
        if (event.status == "connected") {
            setOnlineStatus(1);
        } else {
            setOnlineStatus(0);
        }
    }

    // [Features] GameSetting Functions and States
    const isFirstReadSettings = useRef(false);
    const [gameSettingsModal, setGameSettingsModal] = useState(false);
    const [gameSettings, setGameSettings] = useState({ preGameCountdown: true, endGameCountdown: true, bgm: false });
    const [appealTimerModal, setAppealTimerModal] = useState(false);

    useEffect(() => {
        const localGameSettings = localStorage.getItem("gameSettings");
        if (localGameSettings && !isFirstReadSettings.current) {
            setGameSettings(JSON.parse(localGameSettings));
            isFirstReadSettings.current = true;
        } else {
            localStorage.setItem("gameSettings", JSON.stringify(gameSettings));
        }
    }, [gameSettings]);


    // [Features] Start of Sound Functions
    const [countdownBeep, setCountdownBeep] = useState<any>(null);
    const [countdownBeep10, setCountdownBeep10] = useState<any>(null);
    const [bgm, setBGM] = useState<any>(null);
    useEffect(() => {
        setCountdownBeep(new Audio("/sound/countdown.mp3"));
        setCountdownBeep10(new Audio("/sound/countdown10.mp3"));
        setBGM(new Audio("/sound/bgm.mp3"));
    }, [])

    const soundCheck = (stage: string, remainingTime: number) => {
        switch (stage) {
            case "PREP":
                if (remainingTime <= 3000 && countdownBeep && countdownBeep.paused && gameSettings.preGameCountdown) {
                    countdownBeep.play();
                }
                break;
            case "GAME":
                if (remainingTime <= 179950 && !(remainingTime >= 1798000) && bgm && bgm.paused && gameSettings.bgm) {
                    bgm.volume = 1.0;
                    bgm.play();
                }
                if (remainingTime <= 10000 && countdownBeep10 && countdownBeep10.paused && gameSettings.endGameCountdown) {
                    bgm.volume = 0.7;
                    countdownBeep10.play();
                }
                break;
            case "END":
                if (bgm && !bgm.paused) {
                    bgm.pause();
                    bgm.currentTime = 0;
                }
                break;
        }
    }

    const stopSound = () => {
        //countdownBeep && countdownBeep.pause(); // Ignore countdownBeep to passthough last second beep
        countdownBeep10 && countdownBeep10.pause();
        bgm && bgm.pause();
    }

    const forceStopSound = () => {
        if (countdownBeep && !countdownBeep.paused) {
            countdownBeep.pause();
            countdownBeep.currentTime = 0;
        }
        if (countdownBeep10 && !countdownBeep10.paused) {
            countdownBeep10.pause();
            countdownBeep10.currentTime = 0;
        }
        if (bgm && !bgm.paused) {
            bgm.pause();
            bgm.currentTime = 0;
        }
    }

    // [Features] End of Sound Functions


    // [Core] Start of Clock Functions and States
    const [clockData, setClockData] = useState(ydoc.getMap("clockData") as Y.Map<any>);
    useEffect(() => {
        if (clockData.get("init") == undefined) {
            console.log("Initializing Clock Data")
            ydoc.transact((_y) => {
                clockData.set("stage", "PREP")
                clockData.set("timestamp", 0)
                clockData.set("elapsed", 0)
                clockData.set("paused", true)
                clockData.set("init", true)
            })
        }
    }, [clockData]);

    const [clockText, setClockText] = useState({ minutes: "00", seconds: "00", milliseconds: "000" });
    const [elapsedText, setElapsedText] = useState({ minutes: "00", seconds: "00", milliseconds: "000" });

    const clockInterval = useRef<any>(null);

    // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
    const [clockStage, setClockStage] = useState("PREP" as string);
    const [clockPaused, setClockPaused] = useState(true);

    // [Core] Clock Main Function
    const updateClockText = () => {

        // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
        setClockStage(clockData.get("stage") as string);
        setClockPaused(clockData.get("paused") as boolean);

        // Calculate elapsedTime and remainingTime based on clock paused or not
        // To ensure every clock show the same time when stopped
        const elapsedTime = clockData.get("paused") ? clockData.get("elapsed") as number : (clockData.get("elapsed") as number) + (Date.now() - (clockData.get("timestamp") as number));
        const remainingTime = clockData.get("paused") ? (GAME_STAGES_TIME[GAME_STAGES.indexOf(clockData.get("stage") as string)] * 1000) - (clockData.get("elapsed") as number) : (GAME_STAGES_TIME[GAME_STAGES.indexOf(clockData.get("stage") as string)] * 1000) - (clockData.get("elapsed") as number) - (Date.now() - (clockData.get("timestamp") as number));
        // Check if still have remaining time in the current stage
        if (remainingTime >= 0) {
            // Calculate remainingTime from seconds to human-readable text
            // For On-screen clock display
            const remainingMinutes = Math.floor(remainingTime / 60000) + "";
            const remainingSeconds = Math.floor(remainingTime / 1000 % 60) + "";
            const remainingMilliseconds = remainingTime % 1000 + "";
            setClockText({
                minutes: remainingMinutes.length < 2 ? "0" + remainingMinutes : remainingMinutes,
                seconds: remainingSeconds.length < 2 ? "0" + remainingSeconds : remainingSeconds,
                milliseconds: remainingMilliseconds.length < 3 ? remainingMilliseconds.length < 2 ? "00" + remainingMilliseconds : "0" + remainingMilliseconds : remainingMilliseconds
            })

            // Calculate elapsedTime from seconds to human-readable text
            // For history entries
            const elapsedMinutes = Math.floor(elapsedTime / 60000) + "";
            const elapsedSeconds = Math.floor(elapsedTime / 1000 % 60) + "";
            const elapsedMilliseconds = elapsedTime % 1000 + "";
            setElapsedText({
                minutes: elapsedMinutes.length < 2 ? "0" + elapsedMinutes : elapsedMinutes,
                seconds: elapsedSeconds.length < 2 ? "0" + elapsedSeconds : elapsedSeconds,
                milliseconds: elapsedMilliseconds.length < 3 ? elapsedMilliseconds.length < 2 ? "00" + elapsedMilliseconds : "0" + elapsedMilliseconds : elapsedMilliseconds
            })

            // After-math function
            // That has to check constantly
            soundCheck((clockData.get("stage") as string), remainingTime);

            // Recall itself 57 milliseconds after
            // Yes, it isn't real-time, but it seems ones.
            // The site will crash if you make it real-time. ¯\_(ツ)_/¯
            if (!(clockData.get("paused") as boolean)) {
                // Clock start and stop interval written here due to remote client may start and stop 
                // Which updateClockText will trigger everytime clockData has changed locally or from remote
                // e.g. clockData.observeDeep(updateClockText);
                if (clockInterval.current == null) {
                    // Direct callback instead of wrapping another anomyous function to prevent memory leak ٩(´•⌢•｀ )۶⁼³₌₃
                    const tmpClockInterval = setInterval(updateClockText, 57);
                    clockInterval.current = tmpClockInterval;
                }
            } else {
                // Clear interval if paused
                clearInterval(clockInterval.current);
                clockInterval.current = null;
            }
        } else {
            // There is no remaining time in current stage
            // Continue to next stage

            // Check if still have stage
            if (GAME_STAGES.indexOf(clockData.get("stage") as string) + 1 < GAME_STAGES.length) {
                // Get the new stage name and remaining time
                const newGameStage = GAME_STAGES[GAME_STAGES.indexOf(clockData.get("stage") as string) + 1];
                console.log(`Resetting Timer for ${newGameStage}`);
                const remainingTime = GAME_STAGES_TIME[GAME_STAGES.indexOf(newGameStage)] * 1000;
                ydoc.transact((_y) => {
                    clockData.set("stage", newGameStage);
                    clockData.set("timestamp", Date.now());
                    clockData.set("elapsed", 0);
                    clockData.set("paused", remainingTime > 0 ? false : true);
                })

                if (newGameStage == "END") {
                    toast({
                        title: "Game END",
                        status: 'success',
                        duration: 5000,
                    })
                    //gameEndVictoryCalc();
                }
                // Game start wait judge approval
                if (newGameStage == "GAME") {
                    stopClock();
                    resetStage();
                }
            }
        }
    }

    // [Core] Clock Listener
    // It will trigger everytime clockData has changed locally or from remote
    clockData.observeDeep(updateClockText);

    // [Core] Start of Clock Helper Function
    const startClock = () => {
        console.log("Clock Started")
        ydoc.transact((_y) => {
            clockData.set("stage", clockData.get("stage") as string);
            clockData.set("timestamp", Date.now());
            clockData.set("elapsed", clockData.get("elapsed") as number);
            clockData.set("paused", false);
        })
        toast({
            title: "Clock Started",
            status: 'success',
            duration: 1000,
        })

        if (clockInterval.current == null) {
            // Direct callback instead of wrapping another anomyous function to prevent memory leak ٩(´•⌢•｀ )۶⁼³₌₃
            const tmpClockInterval = setInterval(updateClockText, 57);
            clockInterval.current = tmpClockInterval;
        }
    }

    const stopClock = () => {
        console.log("Clock Stopped")
        const elapsed = (Date.now() - (clockData.get("timestamp") as number)) + (clockData.get("elapsed") as number)
        ydoc.transact((_y) => {
            clockData.set("stage", clockData.get("stage") as string);
            clockData.set("timestamp", Date.now());
            clockData.set("elapsed", elapsed);
            clockData.set("paused", true);
        })
        toast({
            title: "Clock Stopped",
            status: 'success',
            duration: 1000,
        })
        // Delay 50ms to prevent updateClockText start the sound again
        setTimeout(() => { stopSound(); }, 50);

        // Clear interval if paused
        clearInterval(clockInterval.current);
        clockInterval.current = null;
    }

    const toggleClock = () => {
        if (clockData.get("paused") as boolean) {
            startClock();
        } else {
            stopClock();
        }
    }

    const resetStage = () => {
        console.log("Reset Stage Time")
        ydoc.transact((_y) => {
            clockData.set("stage", clockData.get("stage") as string);
            clockData.set("timestamp", Date.now());
            clockData.set("elapsed", 0);
            clockData.set("paused", true);
        })
        toast({
            title: `Reset stage ${clockData.get("stage") as string}`,
            status: 'success',
            duration: 1000,
        })
    }

    const changeStage = (skipStage: number) => {
        const index = GAME_STAGES.indexOf(clockData.get("stage") as string);
        if (index + skipStage < 0) { stopClock(); return; }
        if (index + skipStage > GAME_STAGES.length - 1) { stopClock(); return; }
        const nextStage = GAME_STAGES[index + skipStage];
        const remainingTime = GAME_STAGES_TIME[index + skipStage] * 1000;
        console.log(`Skip stage to ${nextStage}`);
        ydoc.transact((_y) => {
            clockData.set("stage", nextStage);
            clockData.set("timestamp", Date.now());
            clockData.set("elapsed", 0);
            clockData.set("paused", remainingTime > 0 ? false : true);
        })
        toast({
            title: `Skip stage ${clockData.get("stage") as string}`,
            status: 'success',
            duration: 1000,
        })
    }

    // [Core] End of Clock Helper Function
    // [Core] End of Clock Functions and States


    // [Core] Start of GameProps Functions and States
    const [gameProps, setGameProps] = useState(ydoc.getMap("gameProps") as Y.Map<any>);
    if (gameProps.get("init") == undefined) {
        console.log("Initializing GameProps Data")
        ydoc.transact((_y) => {
            gameProps.set("teams", { "redTeam": { "cname": "征龍", "ename": "War Dragon" }, "blueTeam": { "cname": "火之龍", "ename": "Fiery Dragon" }, "greenTeam": { "cname": "東京大学", "ename": "RoboTech" }, "yellowTeam": { "cname": "植搗黃農", "ename": "Golden Farmer" } })

            const gameHistory = new Y.Array();
            gameProps.set("history", gameHistory)

            // const gamePropsSilos = new Y.Array() as Y.Array<string[]>;
            // gamePropsSilos.insert(0, [["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"]])
            // gameProps.set("silos", gamePropsSilos)

            const gamePropsItems = new Y.Map() as Y.Map<number>;
            gamePropsItems.set("redStorageZone", 0);
            gamePropsItems.set("redStartZone", 0);
            gamePropsItems.set("blueStorageZone", 0);
            gamePropsItems.set("blueStartZone", 0);
            gamePropsItems.set("greenStorageZone", 0);
            gamePropsItems.set("greenStartZone", 0);
            gamePropsItems.set("yellowStorageZone", 0);
            gamePropsItems.set("yellowStartZone", 0);
            gameProps.set("items", gamePropsItems)

            gameProps.set("init", true)
        })
    }

    // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
    const [historyState, setHistoryState] = useState<any[]>([]);
    const [itemsState, setItemsState] = useState<any>({
        redStartZone: 0,
        blueStartZone: 0,
        greenStartZone: 0,
        yellowStartZone: 0,
        redStorageZone: 0,
        blueStorageZone: 0,
        greenStorageZone: 0,
        yellowStorageZone: 0
    });

    const [teamState, setTeamState] = useState<{ redTeam: { cname: string; ename: string; }; blueTeam: { cname: string; ename: string; }; greenTeam: { cname: string; ename: string; }; yellowTeam: { cname: string; ename: string; }; }>({
        redTeam: { cname: "征龍", ename: "War Dragon" },
        blueTeam: { cname: "火之龍", ename: "Fiery Dragon" },
        greenTeam: { cname: "東京大学", ename: "RoboTech" },
        yellowTeam: { cname: "植搗黃農", ename: "Golden Farmer" }
    });

    // GameProps Main Scoring Function
    const [scores, setScores] = useState({ redPoints: 0, bluePoints: 0, yellowPoints: 0, greenPoints: 0 });
    const greateVictoryRef = useRef<boolean>(false);

    const scoreCalculation = () => {
        // const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        // const silosYArray = gameProps.get("silos") as Y.Array<string[]>;
        const itemsYMap = gameProps.get("items") as Y.Map<number>;
        /*
        The score is calculated as follows:
        (a) Robots successfully plant 01 (one) Seedling: 10 points.
        (b) Robots successfully harvest 01 (one) Paddy Rice in the Warehouse +: 10
        points.
        (c) Robots successfully harvest 01 (one) Empty Grain in the Warehouse +: 10
        points.
        (d) The Robot 2 successfully stores 01 (one) Paddy Rice in a Silo: 30 points. 
        */

        let redPoints = 0;
        let bluePoints = 0;
        let yellowPoints = 0;
        let greenPoints = 0;

        redPoints += (itemsYMap.get("redStartZone") || 0);
        bluePoints += (itemsYMap.get("blueStartZone") || 0);
        yellowPoints += (itemsYMap.get("yellowStartZone") || 0);
        greenPoints += (itemsYMap.get("greenStartZone") || 0);


        redPoints += (itemsYMap.get("redStorageZone") || 0) * 10;
        bluePoints += (itemsYMap.get("blueStorageZone") || 0) * 10;
        greenPoints += (itemsYMap.get("greenStorageZone") || 0) * 10;
        yellowPoints += (itemsYMap.get("yellowStorageZone") || 0) * 10;





        if (greateVictoryRef.current) {
            setScores({ redPoints, bluePoints, yellowPoints, greenPoints });
            return { redPoints, bluePoints, yellowPoints, greenPoints, redGreatVictory: false, blueGreatVictory: false, greenGreatVictory: false, yellowGreatVictory: false, greatVictoryTimestamp: 0 }
        }

        let greatVictoryObject = { redGreatVictory: false, blueGreatVictory: false, greenGreatVictory: false, yellowGreatVictory: false, greatVictoryTimestamp: 0 }

        if (redPoints >= 100) {
            toast({
                title: "RED GREAT VICTORY",
                status: 'success',
                position: 'bottom-left',
                duration: 5000,
            })
            greateVictoryRef.current = true;
            stopClock();
        }
        if (bluePoints >= 100) {
            toast({
                title: "BLUE GREAT VICTORY",
                status: 'success',
                position: 'bottom-right',
                duration: 5000,
            })
            greateVictoryRef.current = true;
            stopClock();
        }
        if (greenPoints >= 100) {
            toast({
                title: "GREEN GREAT VICTORY",
                status: 'success',
                position: 'bottom-left',
                duration: 5000,
            })
            greateVictoryRef.current = true;
            stopClock();
        }
        if (yellowPoints >= 100) {
            toast({
                title: "YELLOW GREAT VICTORY",
                status: 'success',
                position: 'bottom-left',
                duration: 5000,
            })
            greateVictoryRef.current = true;
            stopClock();
        }


        // if (redOccoupiedSilos >= 3) {
        //     let greatVictoryTimestamp = (GAME_STAGES_TIME[GAME_STAGES.indexOf(clockData.get("stage") as string)] * 1000) - (clockData.get("elapsed") as number) - (Date.now() - (clockData.get("timestamp") as number));
        //     const elapsedTime = (clockData.get("elapsed") as number) + (Date.now() - (clockData.get("timestamp") as number));
        //     const elapsedMinutes = Math.floor(elapsedTime / 60000) + "";
        //     const elapsedSeconds = Math.floor(elapsedTime / 1000 % 60) + "";
        //     const elapsedMilliseconds = elapsedTime % 1000 + "";
        //     const elapsedText = {
        //         minutes: elapsedMinutes.length < 2 ? "0" + elapsedMinutes : elapsedMinutes,
        //         seconds: elapsedSeconds.length < 2 ? "0" + elapsedSeconds : elapsedSeconds,
        //         milliseconds: elapsedMilliseconds.length < 3 ? elapsedMilliseconds.length < 2 ? "00" + elapsedMilliseconds : "0" + elapsedMilliseconds : elapsedMilliseconds
        //     }
        //     toast({
        //         title: "RED GREAT VICTORY",
        //         status: 'success',
        //         position: 'bottom-left',
        //         duration: 5000,
        //     })
        //     greateVictoryRef.current = true;
        //     if (historyYArray.get(historyYArray.length - 1)?.action !== `RED Great Victory`) historyYArray.push([{ action: `RED Great Victory`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "RED" }]);
        //     greatVictoryObject = { redGreatVictory: true, blueGreatVictory: false, greenGreatVictory: false, yellowGreatVictory: false, greatVictoryTimestamp }
        //     stopClock();
        // } else if (blueOccoupiedSilos >= 3) {
        //     let greatVictoryTimestamp = (GAME_STAGES_TIME[GAME_STAGES.indexOf(clockData.get("stage") as string)] * 1000) - (clockData.get("elapsed") as number) - (Date.now() - (clockData.get("timestamp") as number));
        //     const elapsedTime = (clockData.get("elapsed") as number) + (Date.now() - (clockData.get("timestamp") as number));
        //     const elapsedMinutes = Math.floor(elapsedTime / 60000) + "";
        //     const elapsedSeconds = Math.floor(elapsedTime / 1000 % 60) + "";
        //     const elapsedMilliseconds = elapsedTime % 1000 + "";
        //     const elapsedText = {
        //         minutes: elapsedMinutes.length < 2 ? "0" + elapsedMinutes : elapsedMinutes,
        //         seconds: elapsedSeconds.length < 2 ? "0" + elapsedSeconds : elapsedSeconds,
        //         milliseconds: elapsedMilliseconds.length < 3 ? elapsedMilliseconds.length < 2 ? "00" + elapsedMilliseconds : "0" + elapsedMilliseconds : elapsedMilliseconds
        //     }
        //     toast({
        //         title: "BLUE GREAT VICTORY",
        //         status: 'success',
        //         position: 'bottom-right',
        //         duration: 5000,
        //     })
        //     greateVictoryRef.current = true;
        //     if (historyYArray.get(historyYArray.length - 1)?.action !== `BLUE Great Victory`) historyYArray.push([{ action: `BLUE Great Victory`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "BLUE" }])
        //     greatVictoryObject = { redGreatVictory: true, blueGreatVictory: true, greenGreatVictory: false, yellowGreatVictory: false, greatVictoryTimestamp }
        //     stopClock();
        // }

        setScores({ redPoints, bluePoints, yellowPoints, greenPoints });
        return { redPoints, bluePoints, yellowPoints, greenPoints, ...greatVictoryObject }
    }


    // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
    gameProps.observeDeep(() => {

        const teamYMap = gameProps.get("teams") as { redTeam?: { cname: string; ename: string; }; blueTeam?: { cname: string; ename: string; }; greenTeam?: { cname: string; ename: string; }; yellowTeam?: { cname: string; ename: string; }; };
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        // const silosYArray = gameProps.get("silos") as Y.Array<string[]>;
        const itemsYMap = gameProps.get("items") as Y.Map<number>;

        // Ensure all teams have default values if missing
        const defaultTeams = {
            redTeam: { cname: "征龍", ename: "War Dragon" },
            blueTeam: { cname: "火之龍", ename: "Fiery Dragon" },
            greenTeam: { cname: "東京大学", ename: "RoboTech" },
            yellowTeam: { cname: "植搗黃農", ename: "Golden Farmer" }
        };

        setTeamState({
            redTeam: teamYMap?.redTeam || defaultTeams.redTeam,
            blueTeam: teamYMap?.blueTeam || defaultTeams.blueTeam,
            greenTeam: teamYMap?.greenTeam || defaultTeams.greenTeam,
            yellowTeam: teamYMap?.yellowTeam || defaultTeams.yellowTeam,
        });
        setHistoryState(historyYArray.toJSON());
        // setSiloState(silosYArray.toJSON());
        setItemsState(itemsYMap.toJSON());

        scoreCalculation();
    });

    const updateTeam = (value: any, side: string): void => {
        const teamYMap = gameProps.get("teams") as { redTeam?: { cname: string; ename: string; }; blueTeam?: { cname: string; ename: string; }; greenTeam?: { cname: string; ename: string; }; yellowTeam?: { cname: string; ename: string; }; };
        let teams: { [key: string]: any } = teamYMap || {};
        teams[side] = value;
        gameProps.set("teams", teams);
    }

    const siloAction = (x: number, y: number, color: string): void => {
        // Validation
        if (clockData.get("stage") as string === "PREP") {
            toast({
                title: "No editing in PREP stage.",
                status: 'error',
                duration: 500,
            })
            return;
        }

        const silosYArray = gameProps.get("silos") as Y.Array<string[]>;
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        let silo = silosYArray.get(x);

        // Physics Engine \ō͡≡o˞̶ \ō͡≡o˞̶ \ō͡≡o˞̶
        let siloHeight = 0;
        for (let index = 0; index < silo.length; index++) {
            const val = silo[index];
            if (val === "NONE") {
                siloHeight = index;
                break;
            }
            siloHeight = 2;
        }

        if (y > siloHeight) y = siloHeight;

        historyYArray.push([{ action: `Silo ${x} ${y} ${color}`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: color }])

        ydoc.transact((_y) => {
            silo[y] = color;
            silosYArray.delete(x, 1);
            silosYArray.insert(x, [silo]);
        })
    }


    const redStorageZoneAction = (value: number) => {
        const itemsYMap = gameProps.get("items") as Y.Map<number>;
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        // Validation
        if (clockData.get("stage") as string === "PREP") {
            toast({
                title: "No editing in PREP stage.",
                status: 'error',
                duration: 500,
            })
            return;
        }

        historyYArray.push([{ action: `RED Warehouse = ${value}`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "RED" }])
        itemsYMap.set("redStorageZone", value);
    }

    const blueStorageZoneAction = (value: number) => {
        const itemsYMap = gameProps.get("items") as Y.Map<number>;
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        // Validation
        if (clockData.get("stage") as string === "PREP") {
            toast({
                title: "No editing in PREP stage.",
                status: 'error',
                duration: 500,
            })
            return;
        }

        historyYArray.push([{ action: `BLUE Warehouse = ${value}`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "BLUE" }])
        itemsYMap.set("blueStorageZone", value);
    }

    const greenStorageZoneAction = (value: number) => {
        const itemsYMap = gameProps.get("items") as Y.Map<number>;
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        // Validation
        if (clockData.get("stage") as string === "PREP") {
            toast({
                title: "No editing in PREP stage.",
                status: 'error',
                duration: 500,
            })
            return;
        }

        historyYArray.push([{ action: `GREEN Warehouse = ${value}`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "GREEN" }])
        itemsYMap.set("greenStorageZone", value);
    }

    const yellowStorageZoneAction = (value: number) => {
        const itemsYMap = gameProps.get("items") as Y.Map<number>;
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        // Validation
        if (clockData.get("stage") as string === "PREP") {
            toast({
                title: "No editing in PREP stage.",
                status: 'error',
                duration: 500,
            })
            return;
        }

        historyYArray.push([{ action: `YELLOW Warehouse = ${value}`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "YELLOW" }])
        itemsYMap.set("yellowStorageZone", value);
    }

    const startZoneAction = (color: "red" | "blue" | "green" | "yellow", value: number) => {
        const itemsYMap = gameProps.get("items") as Y.Map<number>;
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        const elapsedTime = clockData.get("paused") ? clockData.get("elapsed") as number : (clockData.get("elapsed") as number) + (Date.now() - (clockData.get("timestamp") as number));
        // Validation
        if (clockData.get("stage") as string === "PREP") {
            toast({
                title: "No editing in PREP stage.",
                status: 'error',
                duration: 500,
            })
            return;
        } else if (elapsedTime >= 20000) {
            toast({
                title: "REMIND THAT AFTER 20 SECONDS, START ZONE SCORE IS NOT GIVEN.",
                status: 'warning',
                duration: 5000,
            })
        }

        historyYArray.push([{ action: `${color.toUpperCase()} SZ/First Block`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: color.toUpperCase() }])
        itemsYMap.set(`${color}StartZone`, value);
    }


    // [Core] Start of Helper Functions and States
    const forceReset = () => {
        forceStopSound();
        setScores({ redPoints: 0, bluePoints: 0, yellowPoints: 0, greenPoints: 0 });
        greateVictoryRef.current = false;

        setPattern(patternGenerator() as [string[][], string[][]]);

        ydoc.transact((_y) => {
            // Clearing the map helps prevent memory leak due to removed past history ٩(´•⌢•｀ )۶⁼³₌₃
            clockData.clear()
            gameProps.clear()

            clockData.set("stage", "PREP")
            clockData.set("timestamp", 0)
            clockData.set("elapsed", 0)
            clockData.set("paused", true)
            clockData.set("init", true)

            gameProps.set("teams", { "redTeam": { "cname": "征龍", "ename": "War Dragon" }, "blueTeam": { "cname": "火之龍", "ename": "Fiery Dragon" }, "greenTeam": { "cname": "東京大学", "ename": "RoboTech" }, "yellowTeam": { "cname": "植搗黃農", "ename": "Golden Farmer" } })

            const gameHistory = new Y.Array();
            gameProps.set("history", gameHistory)

            // const gamePropsSilos = new Y.Array() as Y.Array<string[]>;
            // gamePropsSilos.insert(0, [["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"]])
            // gameProps.set("silos", gamePropsSilos)

            const gamePropsItems = new Y.Map() as Y.Map<number>;
            gamePropsItems.set("redStorageZone", 0);
            gamePropsItems.set("redStartZone", 0);
            gamePropsItems.set("blueStorageZone", 0);
            gamePropsItems.set("blueStartZone", 0);
            gamePropsItems.set("greenStorageZone", 0);
            gamePropsItems.set("greenStartZone", 0);
            gamePropsItems.set("yellowStorageZone", 0);
            gamePropsItems.set("yellowStartZone", 0);
            gameProps.set("items", gamePropsItems)

        })
    }
    // [Core] End of Helper Functions and States


    // [Features] PatternGenerator Functions and States
    const [patternRandomGeneratorModal, setPatternRandomGeneratorModal] = useState(false);
    const [pattern, setPattern] = useState<[string[][], string[][]]>([[], []]);

    useEffect(() => {
        if (pattern[0].length === 0) setPattern((patternGenerator() as [string[][], string[][]]));
    }, [pattern])

    return (
        <>
            <Head>
                <title>{"HKUST RDC 2025"}</title>
            </Head>
            <Box style={{
                height: containerHeight,
                position: 'absolute',
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                //overflow: 'hidden',
                backgroundColor: '#3A3B3C',
                fontFamily: "'Quicksand Variable', sans-serif",
                fontWeight: "700",
                fontSize: "2rem",
                color: 'white',
            }}>
                <Box style={{
                    fontSize: '1.3rem',
                    margin: '1rem',
                    zIndex: 10
                }}>
                    <Flex >
                        <Text mr="0.3rem" userSelect="none">{"GameID:"}</Text>
                        <Text
                            cursor="pointer"
                            textShadow="0 0 10px white"
                            color="transparent"
                            _hover={{ textShadow: "none", color: "white" }}
                            onClick={() => {
                                navigator.clipboard.writeText(gameID).then(() =>
                                    toast({ title: "GameID Copied!", status: "success", duration: 1000 })
                                );
                            }}
                        >
                            {gameID}
                        </Text>
                    </Flex>
                    <Flex display={{ base: 'none', md: 'flex' }}>
                        <Button onClick={() => { navigator.clipboard.writeText(gameID).then(() => toast({ title: "GameID Copied!", status: "success", duration: 1000 })) }} colorScheme="blue" size={"sm"}>Copy GameID</Button>
                    </Flex>
                    <Flex display={{ base: 'none', md: 'flex' }}>
                        <Button onClick={() => { navigator.clipboard.writeText(JSON.stringify(gameProps.toJSON())).then(() => toast({ title: "GameProps Copied!", status: "success", duration: 1000 })) }} colorScheme="blue" size={"sm"}>Copy Game Props</Button>
                    </Flex>
                    <Flex display={{ base: 'none', md: 'flex' }}>
                        <Button onClick={() => { forceReset(); toast.closeAll(); toast({ title: "Props Reset!", status: "success", duration: 1000 }) }} colorScheme="red" size={"sm"}>Force Reset</Button>
                    </Flex>
                </Box>
                <Box style={{
                    fontSize: '1rem',
                    margin: '1rem',
                    zIndex: 10,
                    color: onlineStatus == 1 ? 'lightgreen' : onlineStatus == 0 ? 'lightcoral' : 'orange',
                }}>
                    {onlineStatus == 1 ? "Connected" : onlineStatus == 0 ? "Disconnected" : "Large Time Diff"} <FontAwesomeIcon icon={faCircleDot} />
                    <br />
                </Box>
                <Box display={{ base: 'none', md: 'block' }} style={{
                    right: "1rem",
                    top: "2.5rem",
                    zIndex: 10,
                    position: 'absolute',
                    fontSize: '1.3rem',
                    textAlign: 'right',
                }}>
                    <Button onClick={() => { setGameSettingsModal(true) }} colorScheme="teal" size={"sm"}>Game Settings</Button>
                    <br />
                    <Button onClick={() => { setAppealTimerModal(true) }} colorScheme="teal" size={"sm"}>Appeal Timer</Button>
                    {/* <Button onClick={() => { setPatternRandomGeneratorModal(true) }} colorScheme="teal" size={"sm"}>Pattern Generator</Button> */}
                </Box>
                <Box style={{
                    height: '0%',
                    width: '100%',
                    position: 'absolute',
                    justifyContent: 'center',
                }}>
                    {/** Clock Box */}
                    <TimerBox
                        timeText={clockText}
                        gameStage={clockStage}
                        clockToggle={!clockPaused}
                        hidden={false}
                        shorthand={true}
                        toggleClock={toggleClock}
                        resetStage={resetStage}
                        changeStage={changeStage}
                    />
                </Box>
                <Box style={{
                    height: '75%',
                    width: '100%',
                    top: '25%',
                    position: 'absolute',
                }}>
                    {/* Mobile: Vertical Layout for ScoreDisplay with Counters */}
                    <Box display={{ base: 'flex', md: 'none' }} flexDirection="column" alignItems="center" gap="1.5rem" style={{
                        position: 'absolute',
                        top: '5%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        width: '90%',
                    }}>
                        {/* Red Team */}
                        <Box display="flex" flexDirection="column" alignItems="center" gap="0.5rem" width="100%">
                            <ScoreDisplay color={"red"} team={teamState.redTeam} editable={true} score={scores.redPoints} teams={Teams} setTeam={updateTeam} teamColor={"redTeam"} />
                            <Box display="flex" gap="1rem" justifyContent="center" width="100%">
                                <Box display="flex" flexDirection="column" alignItems="center" gap="0.25rem">
                                    <TextHint text="StartZone + First Block" />
                                    <Counter counter={itemsState.redStartZone} setCounter={startZoneAction} color={"red"} />
                                </Box>
                                <Box display="flex" flexDirection="column" alignItems="center" gap="0.25rem">
                                    <TextHint text="Warehouse" />
                                    <CounterType counter={itemsState.redStorageZone} setCounter={redStorageZoneAction} color={"red"} />
                                </Box>
                            </Box>
                        </Box>

                        {/* Green Team */}
                        <Box display="flex" flexDirection="column" alignItems="center" gap="0.5rem" width="100%">
                            <ScoreDisplay color={"green"} team={teamState.greenTeam} editable={true} score={scores.greenPoints} teams={Teams} setTeam={updateTeam} teamColor={"greenTeam"} />
                            <Box display="flex" gap="1rem" justifyContent="center" width="100%">
                                <Box display="flex" flexDirection="column" alignItems="center" gap="0.25rem">
                                    <TextHint text="StartZone + First Block" />
                                    <Counter counter={itemsState.greenStartZone} setCounter={startZoneAction} color={"green"} />
                                </Box>
                                <Box display="flex" flexDirection="column" alignItems="center" gap="0.25rem">
                                    <TextHint text="Warehouse" />
                                    <CounterType counter={itemsState.greenStorageZone} setCounter={greenStorageZoneAction} color={"green"} />
                                </Box>
                            </Box>
                        </Box>

                        {/* Yellow Team */}
                        <Box display="flex" flexDirection="column" alignItems="center" gap="0.5rem" width="100%">
                            <ScoreDisplay color={"yellow"} team={teamState.yellowTeam} editable={true} score={scores.yellowPoints} teams={Teams} setTeam={updateTeam} teamColor={"yellowTeam"} />
                            <Box display="flex" gap="1rem" justifyContent="center" width="100%">
                                <Box display="flex" flexDirection="column" alignItems="center" gap="0.25rem">
                                    <TextHint text="StartZone + First Block" />
                                    <Counter counter={itemsState.yellowStartZone} setCounter={startZoneAction} color={"yellow"} />
                                </Box>
                                <Box display="flex" flexDirection="column" alignItems="center" gap="0.25rem">
                                    <TextHint text="Warehouse" />
                                    <CounterType counter={itemsState.yellowStorageZone} setCounter={yellowStorageZoneAction} color={"yellow"} />
                                </Box>
                            </Box>
                        </Box>

                        {/* Blue Team */}
                        <Box display="flex" flexDirection="column" alignItems="center" gap="0.5rem" width="100%">
                            <ScoreDisplay color={"blue"} team={teamState.blueTeam} editable={true} score={scores.bluePoints} teams={Teams} setTeam={updateTeam} teamColor={"blueTeam"} />
                            <Box display="flex" gap="1rem" justifyContent="center" width="100%">
                                <Box display="flex" flexDirection="column" alignItems="center" gap="0.25rem">
                                    <TextHint text="StartZone/First Block" />
                                    <Counter counter={itemsState.blueStartZone} setCounter={startZoneAction} color={"blue"} />
                                </Box>
                                <Box display="flex" flexDirection="column" alignItems="center" gap="0.25rem">
                                    <TextHint text="Warehouse" />
                                    <CounterType counter={itemsState.blueStorageZone} setCounter={blueStorageZoneAction} color={"blue"} />
                                </Box>
                            </Box>
                        </Box>
                    </Box>

                    {/* Desktop: Original Layout for ScoreDisplay */}
                    {/* Red Team Score - Top Left */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        left: '8%',
                        top: '-15%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ScoreDisplay color={"red"} team={teamState.redTeam} editable={true} score={scores.redPoints} teams={Teams} setTeam={updateTeam} teamColor={"redTeam"} />
                    </Box>

                    {/* Green Team Score - Top Right */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        right: '8%',
                        top: '-15%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ScoreDisplay color={"green"} team={teamState.greenTeam} editable={true} score={scores.greenPoints} teams={Teams} setTeam={updateTeam} teamColor={"greenTeam"} />
                    </Box>

                    {/* Yellow Team Score - Bottom Left */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        left: '8%',
                        top: '43%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ScoreDisplay color={"yellow"} team={teamState.yellowTeam} editable={true} score={scores.yellowPoints} teams={Teams} setTeam={updateTeam} teamColor={"yellowTeam"} />
                    </Box>

                    {/* Blue Team Score - Bottom Right */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        right: '8%',
                        top: '43%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ScoreDisplay color={"blue"} team={teamState.blueTeam} editable={true} score={scores.bluePoints} teams={Teams} setTeam={updateTeam} teamColor={"blueTeam"} />
                    </Box>


                    {/* Red Team History - Top Left */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        left: '8%',
                        top: '15%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <HistoryList history={historyState} team="RED" color={"red"} />
                    </Box>

                    {/* Green Team History - Top Right */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        right: '8%',
                        top: '15%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <HistoryList history={historyState} team="GREEN" color={"green"} />
                    </Box>

                    {/* Yellow Team History - Bottom Left */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        left: '8%',
                        top: '73%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <HistoryList history={historyState} team="YELLOW" color={"yellow"} />
                    </Box>

                    {/* Blue Team History - Bottom Right */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        right: '5%',
                        top: '73%',
                        width: '20%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <HistoryList history={historyState} team="BLUE" color={"blue"} />
                    </Box>
                    <Box style={{
                        height: '95%',
                        width: '100%',
                        zIndex: 1,
                    }}>
                        <Image src="/GameField.webp" fallbackSrc="/GameField.png" alt="Logo" style={{
                            height: '100%',
                            width: '100%',
                            objectFit: 'contain',
                        }} sx={{
                            transform: { base: 'scale(3)', md: 'scale(1)' },
                            transformOrigin: 'center',
                        }} />
                    </Box>

                    {/* Desktop: CounterType - Red Storage Zone */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        left: '37.8%',
                        top: '17.8%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <CounterType counter={itemsState.redStorageZone} setCounter={redStorageZoneAction} color={"red"} />
                    </Box>
                    {/* Desktop: CounterType - Blue Storage Zone */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        right: '37.8%',
                        top: '72%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <CounterType counter={itemsState.blueStorageZone} setCounter={blueStorageZoneAction} color={"blue"} />
                    </Box>
                    {/* Desktop: CounterType - Green Storage Zone */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        right: '37.8%',
                        top: '17.8%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <CounterType counter={itemsState.greenStorageZone} setCounter={greenStorageZoneAction} color={"green"} />
                    </Box>
                    {/* Desktop: CounterType - Yellow Storage Zone */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        left: '37.8%',
                        top: '72%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <CounterType counter={itemsState.yellowStorageZone} setCounter={yellowStorageZoneAction} color={"yellow"} />
                    </Box>

                    {/* Desktop: Counter - Red Start Zone */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        left: '31.8%',
                        top: '3%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <Counter counter={itemsState.redStartZone} setCounter={startZoneAction} color={"red"} />
                    </Box>
                    {/* Desktop: Counter - Blue Start Zone */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        right: '31.8%',
                        top: '86.5%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <Counter
                            counter={itemsState.blueStartZone}
                            setCounter={startZoneAction}
                            color={"blue"}
                        />
                    </Box>
                    {/* Desktop: Counter - Green Start Zone */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        top: '3.2%',
                        right: '31.8%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <Counter
                            counter={itemsState.greenStartZone}
                            setCounter={startZoneAction}
                            color={"green"}
                        />
                    </Box>
                    {/* Desktop: Counter - Yellow Start Zone */}
                    <Box display={{ base: 'none', md: 'block' }} style={{
                        left: '31.8%',
                        top: '86.5%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <Counter
                            counter={itemsState.yellowStartZone}
                            setCounter={startZoneAction}
                            color={"yellow"}
                        />
                    </Box>

                </Box>

            </Box >


            <Modal isOpen={gameIDModal} onClose={() => { }} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Connect to Game Room</ModalHeader>
                    <ModalBody>
                        <Input placeholder="Game ID" ref={gameIDInput} />
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme='blue' mr={3} onClick={() => submitGameID(gameIDInput.current?.value)}>
                            Submit
                        </Button>
                        <Button colorScheme='green' mr={3} onClick={() => submitGameID(String(Math.floor(10000000 + Math.random() * 90000000)))}>
                            Create Game
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={gameSettingsModal} onClose={() => { setGameSettingsModal(false) }} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Game Settings</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Flex my="0.5rem"><Switch colorScheme='teal' size='md' isChecked={gameSettings.preGameCountdown} onChange={() => { setGameSettings({ ...gameSettings, preGameCountdown: !gameSettings.preGameCountdown }) }} /> <Box mt={"-0.2rem"} ml={"0.5rem"}>PreGame 3s Countdown Sound Effect</Box></Flex>
                        <Flex my="0.5rem"><Switch colorScheme='teal' size='md' isChecked={gameSettings.endGameCountdown} onChange={() => { setGameSettings({ ...gameSettings, endGameCountdown: !gameSettings.endGameCountdown }) }} /> <Box mt={"-0.2rem"} ml={"0.5rem"}>EndGame 10s Countdown Sound Effect</Box></Flex>
                        <Flex my="0.5rem"><Switch colorScheme='teal' size='md' isChecked={gameSettings.bgm} onChange={() => { setGameSettings({ ...gameSettings, bgm: !gameSettings.bgm }) }} /> <Box mt={"-0.2rem"} ml={"0.5rem"}>InGame Background Music</Box></Flex>
                    </ModalBody>

                    <ModalFooter>
                        {props.buildVersion ? <Text fontSize={"0.75rem"}>Version: {(props.buildVersion as string).substring(0, 6)}</Text> : <Text fontSize={"0.75rem"}>Version: Development</Text>}
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={appealTimerModal} onClose={() => { setAppealTimerModal(false) }} size="full">
                <ModalOverlay />
                <ModalContent backgroundColor="#3A3B3C" color="white" maxW="100vw" maxH="100vh" m={0}>
                    <ModalHeader>Appeal Timer</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody p={0} display="flex" alignItems="center" justifyContent="center" minH="calc(100vh - 60px)">
                        <AppealTimer onClose={() => setAppealTimerModal(false)} />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    )
}

export const getStaticProps = (async () => {
    const buildVersion = process.env.CF_PAGES_COMMIT_SHA || null;
    return { props: { buildVersion } }
})