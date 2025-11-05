import { Box, Flex, Table, Thead, Tbody, Tr, Th, Td, TableCaption, TableContainer } from "@chakra-ui/react";

export default function HistoryList(props: any) {

    return (
        <Flex>
            
            <Box
                shadow="lg"
                rounded="md"
                style={{
                    fontSize: "2rem",
                    textAlign: "center",
                    lineHeight: "2.5rem",
                    backgroundColor: "white",
                    color: "black",
                    width: "23.5rem",
                    height: "18rem",
                    overflow: "hidden",
                }}
            >
                <Table variant="striped" size="sm">
                    <Thead>
                        <Tr>
                            <Th>Action</Th>
                            <Th>Time</Th>
                        </Tr>
                    </Thead>
                </Table>
                <div
                    style={{
                        overflowY: "scroll",
                        height: "100%",
                        scrollbarWidth: "none",
                        scrollbarColor: "transparent transparent",
                    }}
                >
                    <Table variant="striped" size="sm" colorScheme={props.color || "teal"}>
                        <Tbody>
                            {props.history.slice(0).reverse().map((item: any) => {
                                if (item.team === props.team) {
                                    return (
                                        <Tr key={`${Date.now()}${item.action}${item.time}${String(Math.floor(10000000 + Math.random() * 90000000))}`}>
                                            <Td>{item.action}</Td>
                                            <Td>{item.time}</Td>
                                        </Tr>
                                    )
                                }
                            })}
                            {props.history.filter((item: any) => item.team === props.team).length >= 8 && (
                                <>
                                <Tr><Td></Td></Tr>
                                <Tr><Td></Td></Tr>
                                </>
                            )}
                        </Tbody>
                    </Table>
                </div>
            </Box>
        </Flex>
    );
}
