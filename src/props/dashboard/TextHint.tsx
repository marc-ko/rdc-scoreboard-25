import { Text } from "@chakra-ui/react";

export default function TextHint(props: any) {
    return (
        <Text fontSize="1rem" fontWeight="800" textAlign="center">{props.text}</Text>
    )
}