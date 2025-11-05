import { Box, Flex } from "@chakra-ui/react";


export function ColorPicker(props: any) {
    return (
        <Flex>
            <Box shadow={"lg"} rounded={"lg"} px={"0.5rem"} style={{
                fontSize: props.small? "1.7rem" : "2rem",
                textAlign: "center",
                lineHeight: props.small? "2rem" : "2.5rem",
                backgroundColor: props.color=="RED"?"#F56565":props.color=="BLUE"?"#11B5E4":props.color=="gold"?"#F9A825":"grey",
                color: "black",
                width: props.counter >= 10 ? props.small ? "2.8rem" : "3.1rem" : props.small? "2rem": "2.5rem",
                userSelect: "none",
                cursor: "pointer",
            }}
            onClick={(e)=>{e.preventDefault(); props.setPicker(props.pos[0],props.pos[1],"RED"); }}
            onContextMenu={(e)=>{e.preventDefault(); props.setPicker(props.pos[0],props.pos[1],"BLUE")}}
            >
                &nbsp;
            </Box>
        </Flex>
    )
}