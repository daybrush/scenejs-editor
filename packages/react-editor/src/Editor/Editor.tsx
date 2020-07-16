import * as React from "react";
import InfiniteViewer from "react-infinite-viewer";
import Guides from "@scena/react-guides";
import Selecto, { Rect } from "react-selecto";
import "./Editor.css";
import Menu from "./Menu/Menu";
import Viewport, { JSXInfo } from "./Viewport/Viewport";
import { getContentElement, prefix } from "./utils/utils";
import Tabs from "./Tabs/Tabs";
import EventBus from "./utils/EventBus";
import { IObject } from "@daybrush/utils";
import Memory from "./utils/Memory";
import MoveableManager from "./Viewport/MoveableMananger";
import MoveableData from "./utils/MoveableData";
import KeyManager from "./KeyManager/KeyManager";
import { ScenaEditorState, TagAppendInfo } from "./types";


export default class Editor extends React.PureComponent<{
    width: number,
    height: number,
}, Partial<ScenaEditorState>> {
    public static defaultProps = {
        width: 400,
        height: 600,
    };
    public state: ScenaEditorState = {
        selectedTargets: [],
        horizontalGuides: [],
        verticalGuides: [],
        zoom: 1,
        selectedMenu: "MoveTool",
    };
    public eventBus = new EventBus();
    public memory = new Memory();
    public moveableData = new MoveableData(this.memory);
    public keyManager = new KeyManager();
    public horizontalGuides = React.createRef<Guides>();
    public verticalGuides = React.createRef<Guides>();
    public infiniteViewer = React.createRef<InfiniteViewer>();
    public selecto = React.createRef<Selecto>();
    public menu = React.createRef<Menu>();
    public moveableManager = React.createRef<MoveableManager>();
    public viewport = React.createRef<Viewport>();
    public tabs = React.createRef<Tabs>();
    public render() {
        const {
            horizontalGuides,
            verticalGuides,
            infiniteViewer,
            moveableManager,
            viewport,
            menu,
            tabs,
            selecto,
            state,
        } = this;
        const {
            selectedMenu,
            selectedTargets,
            zoom,
        } = state;
        const {
            width,
            height,
        } = this.props;
        const horizontalSnapGuides = [0, height, height / 2, ...state.horizontalGuides];
        const verticalSnapGuides = [0, width, width / 2, ...state.verticalGuides];
        return (
            <div className={prefix("editor")}>
                <Tabs ref={tabs} editor={this}></Tabs>
                <Menu ref={menu} editor={this} onSelect={this.onMenuChange} />
                <div className={prefix("reset")} onClick={e => {
                    infiniteViewer.current!.scrollCenter();
                }}></div>
                <Guides ref={horizontalGuides}
                    type="horizontal" className={prefix("guides", "horizontal")} style={{}}
                    snapThreshold={5}
                    snaps={horizontalSnapGuides}
                    displayDragPos={true}
                    dragPosFormat={v => `${v}px`}
                    zoom={zoom}
                    onChangeGuides={e => {
                        this.setState({
                            horizontalGuides: e.guides,
                        });
                    }}
                ></Guides>
                <Guides ref={verticalGuides}
                    type="vertical" className={prefix("guides", "vertical")} style={{}}
                    snapThreshold={5}
                    snaps={verticalSnapGuides}
                    displayDragPos={true}
                    dragPosFormat={v => `${v}px`}
                    zoom={zoom}
                    onChangeGuides={e => {
                        this.setState({
                            verticalGuides: e.guides,
                        });
                    }}
                ></Guides>
                <InfiniteViewer ref={infiniteViewer}
                    className={prefix("viewer")}
                    usePinch={true}
                    pinchThreshold={50}
                    zoom={zoom}
                    onDragStart={e => {
                        const target = e.inputEvent.target;
                        this.checkBlur();

                        if (
                            target.nodeName === "A"
                            || moveableManager.current!.getMoveable().isMoveableElement(target)
                            || selectedTargets.some(t => t === target || t.contains(target))
                        ) {
                            e.stop();
                        }
                    }}
                    onDragEnd={e => {
                        if (!e.isDrag) {
                            selecto.current!.clickTarget(e.inputEvent);
                        }
                    }}
                    onAbortPinch={e => {
                        selecto.current!.triggerDragStart(e.inputEvent);
                    }}
                    onScroll={e => {
                        horizontalGuides.current!.scroll(e.scrollLeft);
                        horizontalGuides.current!.scrollGuides(e.scrollTop);

                        verticalGuides.current!.scroll(e.scrollTop);
                        verticalGuides.current!.scrollGuides(e.scrollLeft);
                    }}
                    onPinch={e => {
                        this.setState({
                            zoom: e.zoom,
                        });
                    }}
                >
                    <Viewport ref={viewport} style={{
                        width: `${width}px`,
                        height: `${height}px`,
                    }}>
                        <MoveableManager
                            ref={moveableManager}
                            selectedTargets={selectedTargets}
                            selectedMenu={selectedMenu}
                            verticalGuidelines={verticalSnapGuides}
                            horizontalGuidelines={horizontalSnapGuides}
                            editor={this}
                        ></MoveableManager>
                    </Viewport>
                </InfiniteViewer>
                <Selecto
                    ref={selecto}
                    dragContainer={".scena-viewer"}
                    hitRate={0}
                    selectableTargets={["[data-moveable]"]}
                    selectByClick={true}
                    selectFromInside={false}
                    toggleContinueSelect={["shift"]}
                    preventDefault={true}
                    scrollOptions={
                        infiniteViewer.current ? {
                            container: infiniteViewer.current.getContainer(),
                            threshold: 30,
                            throttleTime: 30,
                            getScrollPosition: () => {
                                const current = infiniteViewer.current!;
                                return [
                                    current.getScrollLeft(),
                                    current.getScrollTop(),
                                ];
                            },
                        } : undefined
                    }
                    onDragStart={e => {
                        const inputEvent = e.inputEvent;
                        const target = inputEvent.target;

                        this.checkBlur();
                        if (selectedMenu === "Text" && target.isContentEditable) {
                            const contentElement = getContentElement(target);

                            if (contentElement && contentElement.hasAttribute("data-moveable")) {
                                e.stop();
                                this.setSelectedTargets([contentElement]);
                            }
                        }
                        if (
                            (inputEvent.type === "touchstart" && e.isTrusted)
                            || moveableManager.current!.getMoveable().isMoveableElement(target)
                            || state.selectedTargets.some(t => t === target || t.contains(target))
                        ) {
                            e.stop();
                        }
                    }}
                    onScroll={({ direction }) => {
                        infiniteViewer.current!.scrollBy(direction[0] * 10, direction[1] * 10);
                    }}
                    onSelectEnd={({ isDragStart, selected, inputEvent, rect }) => {
                        if (isDragStart) {
                            inputEvent.preventDefault();
                        }
                        if (this.selectEndMaker(rect)) {
                            return;
                        }
                        this.setSelectedTargets(selected).then(() => {
                            if (!isDragStart) {
                                return;
                            }
                            moveableManager.current!.getMoveable().dragStart(inputEvent);
                        });
                    }}
                ></Selecto>
            </div>
        );
    }
    public promiseState(state: Partial<ScenaEditorState>) {
        return new Promise(resolve => {
            this.setState(state, () => {
                resolve();
            });
        });
    }
    public getSelectedTargets() {
        return this.state.selectedTargets;
    }
    public setSelectedTargets(targets: Array<HTMLElement | SVGElement>) {
        return this.promiseState({
            selectedTargets: targets,
        }).then(() => {
            this.moveableData.setSelectedTargets(targets);
            this.eventBus.trigger("setSelectedTargets");
            return targets;
        });
    }
    public appendJSX(jsx: any, name: string, frame: IObject<any> = {}) {
        return this.appendJSXs([{ jsx, name, frame }]).then(targets => targets[0]);
    }
    public appendElement(tag: any, props: IObject<any>, name: string, frame: IObject<any> = {}) {
        return this.appendElements([{ tag, props, name, frame }]).then(target => target[0]);
    }
    public appendJSXs(jsxs: JSXInfo[]): Promise<Array<HTMLElement | SVGElement>> {
        return this.viewport.current!.appendJSXs(jsxs).then(({
            added,
        }) => {
            const data = this.moveableData;
            const targets = added.map((info, i) => {
                data.createFrame(info.el!, jsxs[i].frame || {});
                data.render(info.el!);

                return info.el!;
            }).filter(el => el);
            this.setSelectedTargets([added[0].el!]);

            return targets;
        });
    }
    public appendElements(elements: TagAppendInfo[]): Promise<Array<HTMLElement | SVGElement>> {
        return this.appendJSXs(elements.map(({ props, name, frame, tag: Tag }) => ({
            jsx: <Tag {...props}></Tag>,
            name,
            frame,
        })));
    }
    public removeElements(targets: Array<HTMLElement | SVGElement>) {
        const currentTargets = this.moveableData.getSelectedTargets();
        const nextTargets = currentTargets.filter(target => {
            return targets.indexOf(target) === -1;
        });
        targets.forEach(target => {
            this.moveableData.removeFrame(target);
        });
        return this.setSelectedTargets(nextTargets).then(() => {
            this.viewport.current!.removeTargets(targets);
        });
    }
    public selectMenu(menu: string) {
        this.menu.current!.select(menu);
    }
    public getViewportInfos() {
        return this.viewport.current!.state.infos;
    }
    public componentDidMount() {
        const {
            infiniteViewer,
            memory,
            eventBus,
        } = this;
        memory.set("background-color", "#4af");
        memory.set("color", "#333");

        requestAnimationFrame(() => {
            infiniteViewer.current!.scrollCenter();
        });
        window.addEventListener("resize", this.onResize);
        window.addEventListener("wheel", this.onWheel, {
            passive: false,
        });
        const viewport = this.viewport.current!


        eventBus.on("blur", () => {
            this.menu.current!.blur();
            this.tabs.current!.blur();
        });
        eventBus.on("selectLayers", (e: any) => {
            const selected = e.selected as string[];

            this.setSelectedTargets(selected.map(key => viewport.getInfo(key)!.el!));
        });
        eventBus.on("update", () => {
            this.forceUpdate();
        });

        this.keyManager.keyup(["backspace"], () => {
            this.removeElements(this.moveableData.getSelectedTargets());
        });
    }
    public componentWillUnmount() {
        this.eventBus.off();
        this.memory.clear();
        this.moveableData.clear();
        this.keyManager.destroy();
        window.removeEventListener("resize", this.onResize);
        window.removeEventListener("wheel", this.onWheel);
    }
    private onMenuChange = (id: string) => {
        this.setState({
            selectedMenu: id,
        });
    }
    private selectEndMaker(rect: Rect) {
        const infiniteViewer = this.infiniteViewer.current!;
        const selectIcon = this.menu.current!.getSelected();
        const width = rect.width;
        const height = rect.height;

        if (!selectIcon || !selectIcon.maker || !width || !height) {
            return false;
        }
        const maker = selectIcon.maker(this.memory);
        const scrollTop = -infiniteViewer.getScrollTop() + 30;
        const scrollLeft = -infiniteViewer.getScrollLeft() + 75;
        const top = rect.top - scrollTop;
        const left = rect.left - scrollLeft;


        const style = {
            top: `${top}px`,
            left: `${left}px`,
            position: "absolute",
            width: `${width}px`,
            height: `${height}px`,
            ...maker.style,
        } as any;
        this.appendElement(maker.tag, maker.props, `(${selectIcon.id})`, style).then(selectIcon.makeThen);
        return true;
    }
    private checkBlur() {
        const activeElement = document.activeElement;
        if (activeElement) {
            (activeElement as HTMLElement).blur();
        }
        const selection = document.getSelection()!;

        if (selection) {
            selection.removeAllRanges();
        }
        this.eventBus.trigger("blur");
    }
    private onResize = () => {
        this.horizontalGuides.current!.resize();
        this.verticalGuides.current!.resize();
    }
    private onWheel = (e: any) => {
        if (this.keyManager.altKey) {
            e.preventDefault();
            this.setState({
                zoom: Math.max(0.1, this.state.zoom + e.deltaY / 300),
            });
        }
    }
}