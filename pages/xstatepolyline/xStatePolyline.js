import Konva from "konva";
import { createMachine, interpret } from "xstate";


const stage = new Konva.Stage({
    container: "container",
    width: 400,
    height: 400,
});

const layer = new Konva.Layer();
stage.add(layer);

const MAX_POINTS = 10;
let polyline // La polyline en cours de construction;

const polylineMachine = createMachine(
    {
        /** @xstate-layout N4IgpgJg5mDOIC5QAcD2AbAngGQJYDswA6XCdMAYgFkB5AVQGUBRAYWwEkWBpAbQAYAuohSpYuAC65U+YSAAeiAOwAWAIxEVATm2K+ADgBsegEwBmVQBoQmRMdUBWIkdMuzm5XwOn7AXx9W0LDxCEjJKJlgAYwBDZDB+ISQQNDFJaVkFBANVUyJNez0XTT01NXtTKxsEHL4iPlNFez5VPkVVRQN7TUU-AIwcAmJpMAAFVAJxanpmNk5eQVkUiSkZJMyVdS0dfSMzS2tEZWVjIlU9LXsDY0LFY09e5P7gocIxianGJloANSYExdEy3Sa0Qem0eU8xmOmgM7mU2UqiFUylyyl0hQ82lU1z0D0CAxCwze+EmERicX+SSWaVWoHWilynSu5Q65QaiOqdzqBRcyj0hmuxgMyjxT0GRAAttF8JhieJYB8ZhxuJSRKkVhlEE0iFDtDp7GpTPp7BzvMoiPYtopFJo3OZRUFxVKZXKFbRPrMVapEmqgbT5IhTB4iMd0QU+Ia7iaDgg9OpVAZE4nrXxumjNA6CcRnbLxiS3dMvjRfqrHurgXSkXwTqZYTblPkGrCDBzjAU8k0+F3rvDscZM89JdLcxMFQAhaKRADWsGQk-iCypgJpmoQxw5Cdypjb3etzhyuP8j0dIRzrooZNiC59Zb9q6DtVDxr0EZyUdb9R1Db1tYMuk8h59Ce2bDueTAkmAABOpbUhqIIIA+IbGGGL6Rnw0ZVMYxREOc35GCofIOL4Dz4KgEBwACwEAuW-qZAAtC2MYMQO4qkOQ1F3vB2SKCGCZ-mcXaqAmGG2EaThXA2eiWvk8JSSxhKvHm4gcSu8GaKomh1IU24mCophghUMZQuaqY8gmniaKmPRHvig5nkp8BLjRq5CeoSZ-kG6mmMUWEcso9iOBperlIJKh+H4QA */
        id: "polyLine",
        initial: "idle",
        states: {
            idle: {
                on: {
                    MOUSECLICK: {
                        actions: "createLine",
                        target: "onePoint",
                    },
                    Escape: { actions: "abandon" }, // Pour quitter à tout moment
                },
            },
            onePoint: {
                on: {
                    MOUSECLICK: {
                        actions: "addPoint",
                        target: "manyPoints",
                    },
                    MOUSEMOVE: {
                        actions: "setLastPoint",
                    },
                    Escape: { actions: "abandon", target: "idle" },
                },
            },
            manyPoints: {
                on: {
                    MOUSECLICK: [
                        {
                            cond: "pasPlein",
                            actions: "addPoint",
                            target: "manyPoints",
                        },
                        {
                            actions: ["saveLine", "addPoint"],
                            target: "idle",
                        },
                    ],
                    MOUSEMOVE: {
                        actions: "setLastPoint",
                    },
                    Backspace: {
                        actions: "removeLastPoint",
                        cond: "plusDeDeuxPoints",
                        internal: true,
                    },
                    Escape: { actions: "abandon", target: "idle" },
                    Enter: {
                        cond: "plusDeDeuxPoints",
                        actions: "saveLine",
                        target: "idle",
                    },
                },
            },
        },
    },
    {
        actions: {
            createLine: (context, event) => {
                const pos = stage.getPointerPosition();
                polyline = new Konva.Line({
                    points: [pos.x, pos.y, pos.x, pos.y],
                    stroke: "red",
                    strokeWidth: 2,
                });
                layer.add(polyline);
            },
            setLastPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points();
                const size = currentPoints.length;
                const newPoints = currentPoints.slice(0, size - 2);
                polyline.points(newPoints.concat([pos.x, pos.y]));
                layer.batchDraw();
            },
            saveLine: (context, event) => {
                const currentPoints = polyline.points();
                const size = currentPoints.length;
                const newPoints = currentPoints.slice(0, size - 2);
                polyline.points(newPoints);
                layer.batchDraw();
            },
            addPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points();
                const newPoints = [...currentPoints, pos.x, pos.y];
                polyline.points(newPoints);
                layer.batchDraw();
            },
            abandon: (context, event) => {
                polyline.remove();
                layer.batchDraw();
            },
            removeLastPoint: (context, event) => {
                const currentPoints = polyline.points();
                const size = currentPoints.length;
                const provisoire = currentPoints.slice(size - 2, size);
                const oldPoints = currentPoints.slice(0, size - 4);
                polyline.points(oldPoints.concat(provisoire));
                layer.batchDraw();
            },
        },
        guards: {
            pasPlein: (context, event) => {
                return polyline.points().length < MAX_POINTS * 2;
            },
            plusDeDeuxPoints: (context, event) => {
                return polyline.points().length > 4;
            },
        },
    }
);

// On démarre la machine
const polylineService = interpret(polylineMachine)
    .onTransition((state) => {
        console.log("Current state:", state.value);
    })
    .start();
// On envoie les événements à la machine
stage.on("click", () => {
    polylineService.send("MOUSECLICK");
});

stage.on("mousemove", () => {
    polylineService.send("MOUSEMOVE");
});

// Envoi des touches clavier à la machine
window.addEventListener("keydown", (event) => {
    console.log("Key pressed:", event.key);
    // Enverra "a", "b", "c", "Escape", "Backspace", "Enter"... à la machine
    polylineService.send(event.key);
});
