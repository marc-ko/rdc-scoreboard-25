import { Box, Flex, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure, Divider } from "@chakra-ui/react";


export function CounterType(props: any) {
    const { isOpen, onOpen, onClose } = useDisclosure();

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onOpen();
    };

    const handleColorSelect = (color: "purple" | "orange" | "green") => {
        switch (color) {
            case "purple":
                props.setCounter(props.counter + 3);
                break;
            case "orange":
                props.setCounter(props.counter + 2);
                break;
            case "green":
                props.setCounter(props.counter + 1);
                break;
        }
        onClose();
    };

    const getBackgroundColor = () => {
        if (props.color == "red") return "#F56565";
        if (props.color == "blue") return "#11B5E4";
        if (props.color == "gold") return "#F9A825";
        if (props.color == "green") return "#48BB78";
        if (props.color == "yellow") return "#F9A825";
        if (props.color == "purple") return "#9F7AEA";
        if (props.color == "orange") return "#ED8936";
        return "white";
    };

    return (
        <>
            <Flex>
                <Box shadow={"lg"} rounded={"lg"} px={"0.5rem"} style={{
                    fontSize: props.small ? "1.7rem" : "2rem",
                    textAlign: "center",
                    lineHeight: props.small ? "2rem" : "2.5rem",
                    backgroundColor: getBackgroundColor(),
                    color: "black",
                    width: props.counter >= 10 ? props.small ? "2.8rem" : "3.1rem" : props.small ? "2rem" : "2.5rem",
                    userSelect: "none",
                    cursor: "pointer",
                }}
                    onClick={handleClick}
                    onContextMenu={(e) => { props.disableLeftClick ? e.preventDefault() : e.preventDefault(); props.setCounter(props.counter - 1 > 0 ? props.counter - 1 : 0); }}
                >
                    {props.counter}
                </Box>
            </Flex>

            <Modal isOpen={isOpen} onClose={onClose} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Select Score</ModalHeader>
                    <ModalBody>
                        <Flex mb="1rem" gap="1rem" justifyContent="center">
                            <Button
                                colorScheme="purple"
                                size="lg"
                                onClick={() => handleColorSelect("purple")}
                                style={{
                                    backgroundColor: "#9F7AEA",
                                    color: "white",
                                    minWidth: "100px",
                                }}
                            >
                                +30
                            </Button>

                        </Flex>
                        <Flex gap="1rem" justifyContent="center">
                            <Button
                                colorScheme="orange"
                                size="lg"
                                onClick={() => handleColorSelect("orange")}
                                style={{
                                    backgroundColor: "#ED8936",
                                    color: "white",
                                    minWidth: "100px",
                                }}
                            >
                                +20
                            </Button>
                            <Button
                                colorScheme="green"
                                size="lg"
                                onClick={() => handleColorSelect("green")}
                                style={{
                                    backgroundColor: "#48BB78",
                                    color: "white",
                                    minWidth: "100px",
                                }}
                            >
                                +10
                            </Button>
                        </Flex>
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={onClose}>Cancel</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    )
}