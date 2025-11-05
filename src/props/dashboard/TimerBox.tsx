import { GAME_STAGES, GAME_STAGES_TEXT } from "@/common/gameStages";
import { Box, Button, ButtonGroup } from "@chakra-ui/react";
import "@fontsource-variable/source-code-pro";

export default function TimerBox(props: any) {
    const time = props.timeText;
    return (
        <>
            <Box style={{
                position: "relative",
                top: props.hidden ? "-2rem" : "-0.2rem",
                bottom: "-0.5rem",
                fontSize: props.hidden ? "3.5rem" : "2rem",
                textAlign: "center",
                height: "1rem",
            }}>
                {props.shorthand ? props.gameStage : GAME_STAGES_TEXT[GAME_STAGES.indexOf(props.gameStage)]}
            </Box>
            <Box style={{
                position: "relative",
                top: props.hidden ? "1rem" : "-0.5rem",
                bottom: "-0.5rem",
                fontSize: "5rem",
                textAlign: "center",
                height: "6rem",
                fontFamily: "'Source Code Pro Variable', sans-serif",
                fontWeight: "600",
            }}>
                {time.minutes}:{time.seconds}.{time.milliseconds}
            </Box>
            <Box hidden={props.hidden} style={{
                position: "relative",
                top: "-0.6rem",
                textAlign: "center",
                margin: "0"

            }}>
                <ButtonGroup spacing='2'>
                    <Button onClick={() => props.changeStage(-1)}>{"<<"}Prev</Button>
                    <Button onClick={() => props.changeStage(1)}>Next{">>"}</Button>
                    <Button colorScheme={props.clockToggle ? "red" : "green"} onClick={props.toggleClock}>{props.clockToggle ? "Stop" : "Start"}</Button>
                    <Button colorScheme="red" onClick={props.resetStage}>Reset</Button>
                </ButtonGroup>
            </Box>
        </>
    )
}