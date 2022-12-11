import * as React from "react";
import styled from "react-css-styled";
import { prefix } from "../utils/utils";
import LayersTab from "./tabs/LayersTab";

const TabsElement = styled("div", `
{
  position: fixed;
  right: 0;
  top: var(--scena-editor-size-tools);
  bottom: 0;
  width: 250px;
  background: var(--scena-editor-color-back2);
  z-index: 10;
  transform: translateZ(1px);
  border-top: 1px solid var(--scena-editor-color-back4);
  box-sizing: border-box;
  padding: 0px 5px;
}
.scena-tab {

}
.scena-tab h2 {
    margin: 0;
    color: white;
    font-weight: bold;
    font-size: 12px;
    padding: 8px;
}
`);


export function Tabs() {
    return <TabsElement>
        <div className={prefix("tab")}>

        </div>
        <div className={prefix("tab")}>
            <h2>LAYERS</h2>
            <LayersTab />
        </div>
    </TabsElement>;
}