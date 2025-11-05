'use client'

import { GAME_STAGES, GAME_STAGES_TIME } from "@/common/gameStages";
import { patternGenerator } from "@/helpers/patternGenerator";
import { ColorPicker } from "@/props/dashboard/ColorPicker";
import { Counter } from "@/props/dashboard/Counter";
import HistoryList from "@/props/dashboard/HistoryList";
import { ScoreDisplay } from "@/props/dashboard/ScoreDisplay";
import TimerBox from "@/props/dashboard/TimerBox";
import { YJsClient } from "@/yjsClient/yjsClient";
import { Box, Button, Flex, Image, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Switch, Text, useToast } from "@chakra-ui/react";
import "@fontsource-variable/quicksand";
import Head from 'next/head';
import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import Teams from "../props/dashboard/teams.json";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleDot } from '@fortawesome/free-solid-svg-icons';


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
            gameProps.set("teams", { "redTeam": { "cname": "征龍", "ename": "War Dragon" }, "blueTeam": { "cname": "火之龍", "ename": "Fiery Dragon" } })

            const gameHistory = new Y.Array();
            gameProps.set("history", gameHistory)

            const gamePropsSilos = new Y.Array() as Y.Array<string[]>;
            gamePropsSilos.insert(0, [["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"]])
            gameProps.set("silos", gamePropsSilos)

            const gamePropsItems = new Y.Map() as Y.Map<number>;
            gamePropsItems.set("redStorageZone", 0);
            gamePropsItems.set("redSeedling", 0);
            gamePropsItems.set("blueStorageZone", 0);
            gamePropsItems.set("blueSeedling", 0);
            gameProps.set("items", gamePropsItems)

            gameProps.set("init", true)
        })
    }

    // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
    const [siloState, setSiloState] = useState([["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"]]);
    const [historyState, setHistoryState] = useState<any[]>([]);
    const [itemsState, setItemsState] = useState<any>({
        redStorageZone: 0,
        redSeedling: 0,
        blueStorageZone: 0,
        blueSeedling: 0
    });
    const [teamState, setTeamState] = useState<{ redTeam: { cname: string; ename: string; }; blueTeam: { cname: string; ename: string; }; greenTeam: { cname: string; ename: string; }; yellowTeam: { cname: string; ename: string; }; }>({
        redTeam: { cname: "征龍", ename: "War Dragon" },
        blueTeam: { cname: "火之龍", ename: "Fiery Dragon" },
        greenTeam: { cname: "綠之龍", ename: "Green Dragon" },
        yellowTeam: { cname: "黃之龍", ename: "Yellow Dragon" }
    });

    // GameProps Main Scoring Function
    const [scores, setScores] = useState({ redPoints: 0, bluePoints: 0 });
    const greateVictoryRef = useRef<boolean>(false);

    const scoreCalculation = () => {
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        const silosYArray = gameProps.get("silos") as Y.Array<string[]>;
        const itemsYMap = gameProps.get("items") as Y.Map<number>;
        /*
        The score is calculated as follows:
        (a) Robots successfully plant 01 (one) Seedling: 10 points.
        (b) Robots successfully harvest 01 (one) Paddy Rice in the Storage Zone: 10
        points.
        (c) Robots successfully harvest 01 (one) Empty Grain in the Storage Zone: 10
        points.
        (d) The Robot 2 successfully stores 01 (one) Paddy Rice in a Silo: 30 points. 
        */

        let redPoints = 0;
        let bluePoints = 0;

        redPoints += (itemsYMap.get("redSeedling") || 0) * 10;
        bluePoints += (itemsYMap.get("blueSeedling") || 0) * 10;

        redPoints += (itemsYMap.get("redStorageZone") || 0) * 10;
        bluePoints += (itemsYMap.get("blueStorageZone") || 0) * 10;

        silosYArray?.forEach((silo: string[]) => {
            silo.forEach((color: string) => {
                if (color == "RED") redPoints += 30;
                if (color == "BLUE") bluePoints += 30;
            })
        });

        /*
        ‘V Goal’ “Mùa Vàng” (Harvest Glory) is achieved when 3 Silos
        meeting following conditions.
        + A Silo is full (3) and contains a minimum of 2 own team color’s
        Paddy Rice.
        + The top Paddy Rice is of the team’s colour.
        The team wins at the moment when Mua Vang is achieved.
        */

        let redOccoupiedSilos = 0;
        let blueOccoupiedSilos = 0;

        silosYArray?.forEach((silo: string[]) => {
            const siloArray = silo;
            const lastElement = siloArray[siloArray.length - 1];

            if (lastElement === "RED" && siloArray.filter((color: String) => color === "RED").length >= 2 && siloArray.length == 3) {
                redOccoupiedSilos++;
            } else if (lastElement === "BLUE" && siloArray.filter((color: String) => color === "BLUE").length >= 2 && siloArray.length == 3) {
                blueOccoupiedSilos++;
            }
        })

        if (greateVictoryRef.current) {
            setScores({ redPoints, bluePoints });
            return { redPoints, bluePoints, redGreatVictory: false, blueGreatVictory: false, greatVictoryTimestamp: 0 }
        }

        let greatVictoryObject = { redGreatVictory: false, blueGreatVictory: false, greatVictoryTimestamp: 0 }

        if (redOccoupiedSilos >= 3) {
            let greatVictoryTimestamp = (GAME_STAGES_TIME[GAME_STAGES.indexOf(clockData.get("stage") as string)] * 1000) - (clockData.get("elapsed") as number) - (Date.now() - (clockData.get("timestamp") as number));
            const elapsedTime = (clockData.get("elapsed") as number) + (Date.now() - (clockData.get("timestamp") as number));
            const elapsedMinutes = Math.floor(elapsedTime / 60000) + "";
            const elapsedSeconds = Math.floor(elapsedTime / 1000 % 60) + "";
            const elapsedMilliseconds = elapsedTime % 1000 + "";
            const elapsedText = {
                minutes: elapsedMinutes.length < 2 ? "0" + elapsedMinutes : elapsedMinutes,
                seconds: elapsedSeconds.length < 2 ? "0" + elapsedSeconds : elapsedSeconds,
                milliseconds: elapsedMilliseconds.length < 3 ? elapsedMilliseconds.length < 2 ? "00" + elapsedMilliseconds : "0" + elapsedMilliseconds : elapsedMilliseconds
            }
            toast({
                title: "RED GREAT VICTORY",
                status: 'success',
                position: 'bottom-left',
                duration: 5000,
            })
            greateVictoryRef.current = true;
            if (historyYArray.get(historyYArray.length - 1)?.action !== `RED Great Victory`) historyYArray.push([{ action: `RED Great Victory`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "RED" }]);
            greatVictoryObject = { redGreatVictory: true, blueGreatVictory: false, greatVictoryTimestamp }
            stopClock();
        } else if (blueOccoupiedSilos >= 3) {
            let greatVictoryTimestamp = (GAME_STAGES_TIME[GAME_STAGES.indexOf(clockData.get("stage") as string)] * 1000) - (clockData.get("elapsed") as number) - (Date.now() - (clockData.get("timestamp") as number));
            const elapsedTime = (clockData.get("elapsed") as number) + (Date.now() - (clockData.get("timestamp") as number));
            const elapsedMinutes = Math.floor(elapsedTime / 60000) + "";
            const elapsedSeconds = Math.floor(elapsedTime / 1000 % 60) + "";
            const elapsedMilliseconds = elapsedTime % 1000 + "";
            const elapsedText = {
                minutes: elapsedMinutes.length < 2 ? "0" + elapsedMinutes : elapsedMinutes,
                seconds: elapsedSeconds.length < 2 ? "0" + elapsedSeconds : elapsedSeconds,
                milliseconds: elapsedMilliseconds.length < 3 ? elapsedMilliseconds.length < 2 ? "00" + elapsedMilliseconds : "0" + elapsedMilliseconds : elapsedMilliseconds
            }
            toast({
                title: "BLUE GREAT VICTORY",
                status: 'success',
                position: 'bottom-right',
                duration: 5000,
            })
            greateVictoryRef.current = true;
            if (historyYArray.get(historyYArray.length - 1)?.action !== `BLUE Great Victory`) historyYArray.push([{ action: `BLUE Great Victory`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "BLUE" }])
            greatVictoryObject = { redGreatVictory: true, blueGreatVictory: true, greatVictoryTimestamp }
            stopClock();
        }

        setScores({ redPoints, bluePoints });
        return { redPoints, bluePoints, ...greatVictoryObject }
    }


    // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
    gameProps.observeDeep(() => {

        const teamYMap = gameProps.get("teams") as { redTeam: { cname: string; ename: string; }; blueTeam: { cname: string; ename: string; }; };
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        const silosYArray = gameProps.get("silos") as Y.Array<string[]>;
        const itemsYMap = gameProps.get("items") as Y.Map<number>;
        setTeamState(teamYMap);
        setHistoryState(historyYArray.toJSON());
        setSiloState(silosYArray.toJSON());
        setItemsState(itemsYMap.toJSON());

        scoreCalculation();
    });

    const updateTeam = (value: any, side: string): void => {
        const teamYMap = gameProps.get("teams") as { redTeam: { cname: string; ename: string; }; blueTeam: { cname: string; ename: string; }; };
        let teams: { [key: string]: any } = teamYMap;
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
        if (value > (itemsYMap.get("redSeedling") as number || 0)) {
            toast({
                title: "Storage Zone exceeded placed Seedling!",
                status: 'error',
                position: 'bottom-left',
                duration: 500,
            })
            return;
        }

        historyYArray.push([{ action: `RED Storage Zone ${value}`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "RED" }])
        itemsYMap.set("redStorageZone", value);
    }

    const redSeedlingAction = (value: number) => {
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
        if (value > 12) {
            toast({
                title: "Seedling exceeded!",
                status: 'error',
                position: 'bottom-left',
                duration: 500,
            })
            return;
        }

        historyYArray.push([{ action: `RED Seedling ${value}`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "RED" }])
        itemsYMap.set("redSeedling", value);
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
        if (value > (itemsYMap.get("blueSeedling") as number || 0)) {
            toast({
                title: "Storage Zone exceeded placed Seedling!",
                status: 'error',
                position: 'bottom-right',
                duration: 500,
            })
            return;
        }

        historyYArray.push([{ action: `BLUE Storage Zone ${value}`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "BLUE" }])
        itemsYMap.set("blueStorageZone", value);
    }

    const blueSeedlingAction = (value: number) => {
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
        if (value > 12) {
            toast({
                title: "Seedling exceeded!",
                status: 'error',
                position: 'bottom-right',
                duration: 500,
            })
            return;
        }

        historyYArray.push([{ action: `BLUE Seedling ${value}`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "BLUE" }])
        itemsYMap.set("blueSeedling", value);
    }

    const resetProps = () => {
        ydoc.transact((_y) => {
            gameProps.clear()
        });

        ydoc.transact((_y) => {
            const gamePropsSilos = new Y.Array() as Y.Array<string[]>;
            gamePropsSilos.insert(0, [["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"]])
            gameProps.set("silos", gamePropsSilos)

            const gamePropsItems = new Y.Map() as Y.Map<number>;
            gamePropsItems.set("redStorageZone", 0);
            gamePropsItems.set("redSeedling", 0);
            gamePropsItems.set("blueStorageZone", 0);
            gamePropsItems.set("blueSeedling", 0);
            gameProps.set("items", gamePropsItems)

            gameProps.set("init", true)
        })
    }

    // [Core] End of GameProps Functions and States


    // [Core] Start of Helper Functions and States
    const forceReset = () => {
        forceStopSound();
        setScores({ redPoints: 0, bluePoints: 0 });
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

            gameProps.set("teams", { "redTeam": { "cname": "征龍", "ename": "War Dragon" }, "blueTeam": { "cname": "火之龍", "ename": "Fiery Dragon" } })

            const gameHistory = new Y.Array();
            gameProps.set("history", gameHistory)

            const gamePropsSilos = new Y.Array() as Y.Array<string[]>;
            gamePropsSilos.insert(0, [["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"]])
            gameProps.set("silos", gamePropsSilos)

            const gamePropsItems = new Y.Map() as Y.Map<number>;
            gamePropsItems.set("redStorageZone", 0);
            gamePropsItems.set("redSeedling", 0);
            gamePropsItems.set("blueStorageZone", 0);
            gamePropsItems.set("blueSeedling", 0);
            gameProps.set("items", gamePropsItems)

            gameProps.set("init", true)
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
                <title>{"HKUST Robocon 2024"}</title>
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
                    GameID: {gameID}
                    <br />
                    <Button onClick={() => { navigator.clipboard.writeText(gameID).then(() => toast({ title: "GameID Copied!", status: "success", duration: 1000 })) }} colorScheme="blue" size={"sm"}>Copy GameID</Button>
                    <br />
                    <Button onClick={() => { navigator.clipboard.writeText(JSON.stringify(gameProps.toJSON())).then(() => toast({ title: "GameProps Copied!", status: "success", duration: 1000 })) }} colorScheme="blue" size={"sm"}>Copy Game Props</Button>
                    <br />
                    <Button onClick={() => { forceReset(); toast.closeAll(); toast({ title: "Props Reset!", status: "success", duration: 1000 }) }} colorScheme="red" size={"sm"}>Force Reset</Button>

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
                <Box style={{
                    right: "1rem",
                    top: "2.5rem",
                    zIndex: 10,
                    position: 'absolute',
                    fontSize: '1.3rem',
                    textAlign: 'right',
                }}>
                    <Button onClick={() => { setGameSettingsModal(true) }} colorScheme="teal" size={"sm"}>Game Settings</Button>
                    <br />
                    <Button onClick={() => { setPatternRandomGeneratorModal(true) }} colorScheme="teal" size={"sm"}>Pattern Generator</Button>
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
                    <Box style={{
                        left: '6%',
                        top: '-5%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ScoreDisplay color={"red"} team={teamState.redTeam} editable={true} score={scores.redPoints} teams={Teams} setTeam={updateTeam} teamColor={"redTeam"} />
                    </Box>
                    <Box style={{
                        right: '6%',
                        top: '-5%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ScoreDisplay color={"blue"} team={teamState.blueTeam} editable={true} score={scores.bluePoints} teams={Teams} setTeam={updateTeam} teamColor={"blueTeam"} />
                    </Box>
                    <Box style={{
                        left: '4%',
                        top: '41%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <HistoryList history={historyState} team="RED" color={"red"} />
                    </Box>
                    <Box style={{
                        right: '4%',
                        top: '41%',
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
                        }} />
                    </Box>

                    <Box
                        shadow="lg"
                        rounded="md"
                        style={{
                            left: '39.3%',
                            top: '0.5%',
                            position: 'absolute',
                            zIndex: 10,
                            fontSize: "2rem",
                            textAlign: "center",
                            lineHeight: "2.5rem",
                            backgroundColor: "white",
                            color: "black",
                            width: "19.7rem",
                            height: "10.5rem",
                            overflow: "hidden",
                        }}
                    >
                        <Box style={{
                            left: '10%',
                            bottom: '8%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[0][0]} setPicker={siloAction} pos={[0, 0]} />
                        </Box>
                        <Box style={{
                            left: '10%',
                            bottom: '38%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[0][1]} setPicker={siloAction} pos={[0, 1]} />
                        </Box>
                        <Box style={{
                            left: '10%',
                            bottom: '68%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[0][2]} setPicker={siloAction} pos={[0, 2]} />
                        </Box>

                        <Box style={{
                            left: '27%',
                            bottom: '8%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[1][0]} setPicker={siloAction} pos={[1, 0]} />
                        </Box>
                        <Box style={{
                            left: '27%',
                            bottom: '38%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[1][1]} setPicker={siloAction} pos={[1, 1]} />
                        </Box>
                        <Box style={{
                            left: '27%',
                            bottom: '68%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[1][2]} setPicker={siloAction} pos={[1, 2]} />
                        </Box>

                        <Box style={{
                            left: '43.5%',
                            bottom: '8%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[2][0]} setPicker={siloAction} pos={[2, 0]} />
                        </Box>
                        <Box style={{
                            left: '43.5%',
                            bottom: '38%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[2][1]} setPicker={siloAction} pos={[2, 1]} />
                        </Box>
                        <Box style={{
                            left: '43.5%',
                            bottom: '68%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[2][2]} setPicker={siloAction} pos={[2, 2]} />
                        </Box>

                        <Box style={{
                            left: '60%',
                            bottom: '8%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[3][0]} setPicker={siloAction} pos={[3, 0]} />
                        </Box>
                        <Box style={{
                            left: '60%',
                            bottom: '38%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[3][1]} setPicker={siloAction} pos={[3, 1]} />
                        </Box>
                        <Box style={{
                            left: '60%',
                            bottom: '68%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[3][2]} setPicker={siloAction} pos={[3, 2]} />
                        </Box>

                        <Box style={{
                            left: '76.5%',
                            bottom: '8%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[4][0]} setPicker={siloAction} pos={[4, 0]} />
                        </Box>
                        <Box style={{
                            left: '76.5%',
                            bottom: '38%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[4][1]} setPicker={siloAction} pos={[4, 1]} />
                        </Box>
                        <Box style={{
                            left: '76.5%',
                            bottom: '68%',
                            position: 'absolute',
                            zIndex: 10,
                        }}>
                            <ColorPicker color={siloState[4][2]} setPicker={siloAction} pos={[4, 2]} />
                        </Box>

                    </Box>

                    <Box style={{
                        left: '34.7%',
                        top: '12.5%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <Counter counter={itemsState.redStorageZone} setCounter={redStorageZoneAction} color={"red"} />
                    </Box>
                    <Box style={{
                        left: '62.7%',
                        top: '12.5%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <Counter counter={itemsState.blueStorageZone} setCounter={blueStorageZoneAction} color={"blue"} />
                    </Box>
                    <Box style={{
                        left: '42%',
                        top: '71.3%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <Counter counter={itemsState.redSeedling} setCounter={redSeedlingAction} color={"red"} />
                    </Box>
                    <Box style={{
                        left: '55.3%',
                        top: '71.3%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <Counter counter={itemsState.blueSeedling} setCounter={blueSeedlingAction} color={"blue"} />
                    </Box>
                </Box>

            </Box>


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

            <Modal isOpen={patternRandomGeneratorModal} onClose={() => { setPatternRandomGeneratorModal(false) }} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Pattern Generator</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Box>
                            <Box my="1rem" style={{ transform: 'rotate(45deg)' }}>
                                {pattern[1].map((row, rowIndex) => {
                                    return (
                                        <Box key={rowIndex} style={{ display: "flex", justifyContent: "center" }}>
                                            {row.map((cell, cellIndex) => {
                                                return (
                                                    <Box key={cellIndex} style={{ width: "2rem", height: "2rem", backgroundColor: cell == "red" ? "red" : cell == "purple" ? "purple" : "white", borderRadius: "50%" }}></Box>
                                                )
                                            })}
                                        </Box>
                                    )
                                })}
                            </Box>
                            <Box mb="0.5rem" mt="4rem">
                                {pattern[0].map((row, rowIndex) => {
                                    return (
                                        <Box key={rowIndex} style={{ display: "flex", justifyContent: "center" }}>
                                            {row.map((cell, cellIndex) => {
                                                return (
                                                    <Box key={cellIndex} style={{ width: "2rem", height: "2rem", backgroundColor: cell == "red" ? "red" : cell == "purple" ? "purple" : "white", borderRadius: "50%" }}></Box>
                                                )
                                            })}
                                        </Box>
                                    )
                                })}
                            </Box>
                            <br />
                            <Button onClick={() => { setPattern((patternGenerator() as [string[][], string[][]])) }} colorScheme="teal">Generate Random Pattern</Button>
                        </Box>
                    </ModalBody>

                    <ModalFooter>
                        <Text fontSize={"0.75rem"}>Idealogy by Starfall</Text>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    )
}

export const getStaticProps = (async () => {
    const buildVersion = process.env.CF_PAGES_COMMIT_SHA || null;
    return { props: { buildVersion } }
})