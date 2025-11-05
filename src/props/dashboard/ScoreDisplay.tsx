import { Box, Flex, List, ListItem, Select } from "@chakra-ui/react";
import { useEffect, useState } from "react";


export function ScoreDisplay(props: any) {

    const [dropDownOpen, setDropDownOpen] = useState(false);

    return (
        <Flex>
            <Box shadow={"lg"} rounded={"md"} style={{
                fontSize: "2rem",
                textAlign: "center",
                lineHeight: "2.5rem",
                backgroundColor: props.color=="red"?"#F56565":props.color=="blue"?"#11B5E4":"white",
                color: "black",
                width: "20rem",
            }}
            >   
                {props.editable ?
                (<Box mt={"1rem"} p={"0"}>
                    <Box mt={"1rem"} onClick={()=>{setDropDownOpen(!dropDownOpen)}} style={{cursor: "pointer"}}>
                        {props.team.cname}
                        <br />
                        {props.team.ename}
                    </Box>
                    {dropDownOpen && <TeamDropDownList teams={props.teams} setTeam={props.setTeam} teamColor={props.teamColor} currentTeam={props.team.ename} setOpen={setDropDownOpen}/>}
                    <Box my={"3rem"} style={{fontSize: "4rem"}}>
                        {props.score}
                    </Box>
                </Box>) :
                (<>
                    <Box mt={"1rem"}>
                        {props.team.cname}
                        <br />
                        {props.team.ename}
                    </Box>
                    <Box my={"3rem"} style={{fontSize: "4rem"}}>
                        {props.score}
                    </Box>
                </>)}
            </Box>
        </Flex>
    )
}


function TeamDropDownList(props: any) {
    return (
        <Box
          maxH="xs"
          bg="white"
          width="full"
          zIndex={999}
          height="auto"
          maxHeight="10rem"
          overflow="auto"
          borderRadius="lg"
          position="absolute"
          boxShadow="0px 1px 30px rgba(0, 0, 0, 0.1)"
        >
          <List>
            {props.teams?.map((item: any, index: number) => (
              <ListItem
                key={index}
                paddingY={2}
                marginX={2}
                color="#ACB9C4"
                cursor="pointer"
                fontWeight="500"
                textTransform="capitalize"
                onClick={() => {
                    props.setTeam(item, props.teamColor);
                    props.setOpen(false);
                }}
                style={{ transition: "all .125s ease" }}
                _hover={{ bg: "gray.50", color: "#396070" }}
                sx={
                  item?.ename === props.currentTeam
                    ? { backgroundColor: "gray.50", color: "#396070" }
                    : {}
                }
              >
                {item?.ename}
              </ListItem>
            ))}
          </List>
        </Box>
      );
}