import React from "react";
import { useModal } from "./Modal";
import "./Modal.css";

export function ModalButton({
    modalComponent,
    itemText,
    onItemClick,
    onModalClose,
    itemClass = "modal-item",
    children,
}) {
    const { setModalContent, setOnModalClose } = useModal();

    const onClick = (e) => {
        if (e && typeof e.stopPropagation === "function") {
            e.stopPropagation();
        }
        if (onModalClose) setOnModalClose(onModalClose);
        setModalContent(modalComponent);
        if (typeof onItemClick === "function") onItemClick();
    };

    const content = itemText || children;

    if (React.isValidElement(content)) {
        return React.cloneElement(content, {
            onClick: (e) => {
                if (typeof content.props.onClick === "function") {
                    content.props.onClick(e);
                }
                onClick(e);
            },
        });
    }

    return (
        <button id="base-modal-button" type="button" className={itemClass} onClick={onClick}>
            {content}
        </button>
    );
}

export function ModalItem({
    modalComponent,
    itemText,
    onItemClick,
    onModalClose,
    itemClass = "modal-item"
}) {
    const { setModalContent, setOnModalClose } = useModal();

    const onClick = () => {
        if (onModalClose) setOnModalClose(onModalClose);
        setModalContent(modalComponent);
        if(typeof onItemClick === "function") onItemClick();
    }

    return (
        <li id="base-modal-button" className={itemClass} onClick={onClick}>{itemText}</li>
    )
}