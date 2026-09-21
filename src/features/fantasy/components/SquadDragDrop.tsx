import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { colors } from "../../../theme/tokens";
import {
  findSquadDropTarget,
  type DragBounds,
  type DragPoint,
} from "../utils/squadInteractions";
import { useSquadDragGesture } from "../utils/useSquadDragGesture";

type DragState = { source: number; target: number | null };
type DragContextValue = {
  enabled: boolean;
  state: DragState | null;
  register: (slot: number, node: View | null) => void;
  canDrop: (source: number, target: number) => boolean;
  begin: (source: number, point: DragPoint) => void;
  move: (point: DragPoint) => void;
  finish: (point: DragPoint) => void;
  cancel: () => void;
};
const DragContext = createContext<DragContextValue | null>(null);

function measure(node: View): Promise<DragBounds> {
  if (Platform.OS === "web") {
    const rect = (node as unknown as HTMLElement).getBoundingClientRect();
    return Promise.resolve({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }
  return new Promise((resolve) =>
    node.measureInWindow((x, y, width, height) =>
      resolve({ x, y, width, height }),
    ),
  );
}

export function SquadDragDrop({
  children,
  enabled,
  fitToAvailableHeight,
  canDrop,
  onDrop,
  onDraggingChange,
  renderPreview,
}: {
  children: ReactNode;
  enabled: boolean;
  fitToAvailableHeight: boolean;
  canDrop: (source: number, target: number) => boolean;
  onDrop: (source: number, target: number) => void;
  onDraggingChange?: (dragging: boolean) => void;
  renderPreview: (slot: number) => ReactNode;
}) {
  const root = useRef<View>(null);
  const nodes = useRef(new Map<number, View>());
  const session = useRef<{
    source: number;
    point: DragPoint;
    bounds?: Map<number, DragBounds>;
    root?: DragBounds;
  } | null>(null);
  const latest = useRef({ enabled, canDrop, onDrop, onDraggingChange });
  latest.current = { enabled, canDrop, onDrop, onDraggingChange };
  const [state, setState] = useState<DragState | null>(null);
  const offset = useRef(new Animated.ValueXY()).current;
  const cancel = () => {
    const wasDragging = Boolean(session.current);
    session.current = null;
    if (wasDragging) latest.current.onDraggingChange?.(false);
    setState(null);
  };

  useEffect(() => {
    if (!enabled) cancel();
  }, [enabled]);
  useEffect(
    () => () => {
      const wasDragging = Boolean(session.current);
      session.current = null;
      if (wasDragging) latest.current.onDraggingChange?.(false);
    },
    [],
  );

  const move = (point: DragPoint) => {
    const drag = session.current;
    if (!drag) return;
    drag.point = point;
    if (!drag.bounds || !drag.root) return;
    offset.setValue({
      x: point.x - drag.root.x,
      y: point.y - drag.root.y,
    });
    const target = findSquadDropTarget(point, drag.bounds, (slot) =>
      latest.current.canDrop(drag.source, slot),
    );
    setState((previous) =>
      previous?.source === drag.source && previous.target === target
        ? previous
        : { source: drag.source, target },
    );
  };
  const begin = async (source: number, point: DragPoint) => {
    if (!latest.current.enabled || !root.current) return;
    const drag = { source, point } as NonNullable<typeof session.current>;
    session.current = drag;
    // Lock the parent ScrollView before waiting for native measurements.
    latest.current.onDraggingChange?.(true);
    // Window-space measurements include the desktop pitch's scale transform.
    const rootBounds = await measure(root.current);
    const entries = await Promise.all(
      [...nodes.current].map(
        async ([slot, node]) => [slot, await measure(node)] as const,
      ),
    );
    if (session.current !== drag || !latest.current.enabled) return;
    drag.root = rootBounds;
    drag.bounds = new Map(entries);
    move(drag.point);
  };
  const finish = (point: DragPoint) => {
    const drag = session.current;
    const target =
      drag?.bounds && latest.current.enabled
        ? findSquadDropTarget(point, drag.bounds, (slot) =>
            latest.current.canDrop(drag.source, slot),
          )
        : null;
    cancel();
    if (drag && target !== null) latest.current.onDrop(drag.source, target);
  };

  return (
    <DragContext.Provider
      value={{
        enabled,
        state,
        canDrop,
        begin,
        move,
        finish,
        cancel,
        register: (slot, node) => {
          if (node) nodes.current.set(slot, node);
          else nodes.current.delete(slot);
        },
      }}
    >
      <View
        ref={root}
        collapsable={false}
        style={[localStyles.root, fitToAvailableHeight && localStyles.fitted]}
      >
        {children}
        {state ? (
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            aria-hidden
            style={[
              localStyles.preview,
              { transform: offset.getTranslateTransform() },
            ]}
          >
            <View style={localStyles.previewAnchor}>
              {renderPreview(state.source)}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </DragContext.Provider>
  );
}

export function SquadDragSlot({
  children,
  slot,
  hasPlayer,
  onPress,
}: {
  children: (props: {
    onPress: () => void;
    dragState: "source" | "candidate" | "unavailable" | null;
  }) => ReactNode;
  slot: number;
  hasPlayer: boolean;
  onPress: () => void;
}) {
  const context = useContext(DragContext)!;
  const node = useRef<View>(null);
  const gesture = useSquadDragGesture(node, {
    enabled: context.enabled && hasPlayer,
    begin: (point) => context.begin(slot, point),
    move: context.move,
    finish: context.finish,
    cancel: context.cancel,
  });
  const dragState = !context.state
    ? null
    : context.state.source === slot
      ? "source"
      : context.canDrop(context.state.source, slot)
        ? "candidate"
        : "unavailable";
  return (
    <View
      ref={(value) => {
        node.current = value;
        context.register(slot, value);
      }}
      collapsable={false}
      {...gesture.panHandlers}
      style={[
        localStyles.slot,
        Platform.OS === "web" && context.enabled && hasPlayer
          ? ({
              cursor: context.state ? "grabbing" : "grab",
              userSelect: "none",
            } as unknown as ViewStyle)
          : null,
      ]}
    >
      {children({
        dragState,
        onPress: () => {
          if (!gesture.shouldSuppressPress()) onPress();
        },
      })}
      {context.state?.target === slot ? (
        <View pointerEvents="none" style={localStyles.target} />
      ) : null}
    </View>
  );
}

const localStyles = StyleSheet.create({
  root: { position: "relative", minHeight: 0 },
  fitted: { flex: 1 },
  slot: { alignSelf: "center" },
  preview: { position: "absolute", top: 0, left: 0, zIndex: 100, opacity: 0.9 },
  previewAnchor: {
    transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
  },
  target: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderRadius: 8,
    borderColor: colors.brand.yellow,
  },
});
