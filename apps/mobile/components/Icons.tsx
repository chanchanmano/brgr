import Svg, { Circle, Path, Rect } from "react-native-svg";

type IconProps = {
  color?: string;
  size?: number;
};

export function OrdersIcon({ color = "#1A1410", size = 22 }: IconProps) {
  // Receipt / list icon — represents past + queued orders.
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Path d="M9 8h6M9 12h6M9 16h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function TranscriptIcon({ color = "#1A1410", size = 22 }: IconProps) {
  // Speech bubble with three dots — unambiguous "conversation" affordance.
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5h16v10H8l-4 4V5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Circle cx="8.5" cy="10" r="1.1" fill={color} />
      <Circle cx="12" cy="10" r="1.1" fill={color} />
      <Circle cx="15.5" cy="10" r="1.1" fill={color} />
    </Svg>
  );
}

export function MicIcon({ color = "#1A1410", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="3" width="6" height="11" rx="3" fill={color} />
      <Path d="M5 11a7 7 0 0 0 14 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M12 18v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function CartIcon({ color = "#1A1410", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5h2.1l2 10.8a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.5L21.2 9H7.2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="10" cy="20.2" r="1.4" fill={color} />
      <Circle cx="17" cy="20.2" r="1.4" fill={color} />
    </Svg>
  );
}

export function ArrowRightIcon({ color = "#1A1410", size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M13 6l6 6-6 6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CloseIcon({ color = "#1A1410", size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

export function SparkIcon({ color = "#FFFFFF", size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" fill={color} />
    </Svg>
  );
}

export function MenuIcon({ color = "#1A1410", size = 22 }: IconProps) {
  // Three equal horizontal lines — proper hamburger menu (not text-align).
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16M4 12h16M4 17h16" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

export function BackIcon({ color = "#1A1410", size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6 9 12l6 6" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SearchIcon({ color = "#776B5C", size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
      <Path d="m20 20-4-4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

