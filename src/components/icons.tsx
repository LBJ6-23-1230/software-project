import { forwardRef } from "react";
import {
  AlertTriangle as AlertTriangleIcon,
  ArrowRight as ArrowRightIcon,
  ArrowUpRight as ArrowUpRightIcon,
  CalendarDays as CalendarDaysIcon,
  Check as CheckIcon,
  CheckCircle2 as CheckCircle2Icon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CircleHelp as CircleHelpIcon,
  ClipboardList as ClipboardListIcon,
  Clock3 as Clock3Icon,
  Compass as CompassIcon,
  DatabaseBackup as DatabaseBackupIcon,
  FileCheck2 as FileCheck2Icon,
  HeartHandshake as HeartHandshakeIcon,
  ImagePlus as ImagePlusIcon,
  Leaf as LeafIcon,
  LoaderCircle as LoaderCircleIcon,
  LogIn as LogInIcon,
  LogOut as LogOutIcon,
  MapPin as MapPinIcon,
  Menu as MenuIcon,
  MessageCircle as MessageCircleIcon,
  Pencil as PencilIcon,
  Plus as PlusIcon,
  RefreshCw as RefreshCwIcon,
  RotateCcw as RotateCcwIcon,
  Scale as ScaleIcon,
  Search as SearchIcon,
  SearchX as SearchXIcon,
  Send as SendIcon,
  ShieldCheck as ShieldCheckIcon,
  SlidersHorizontal as SlidersHorizontalIcon,
  Sparkles as SparklesIcon,
  Upload as UploadIcon,
  UserRound as UserRoundIcon,
  X as XIcon,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * 视障友好适配：本项目所有图标都与可见文字或 aria-label 同时出现，
 * 属于装饰性图形。统一加 aria-hidden / focusable=false，避免屏幕阅读器
 * 把没有名称的 svg 读成“图形”或重复朗读。
 */
function accessible(Icon: LucideIcon) {
  return forwardRef<SVGSVGElement, LucideProps>((props, ref) => (
    <Icon ref={ref} aria-hidden="true" focusable="false" {...props} />
  ));
}

export const AlertTriangle = accessible(AlertTriangleIcon);
export const ArrowRight = accessible(ArrowRightIcon);
export const ArrowUpRight = accessible(ArrowUpRightIcon);
export const CalendarDays = accessible(CalendarDaysIcon);
export const Check = accessible(CheckIcon);
export const CheckCircle2 = accessible(CheckCircle2Icon);
export const ChevronLeft = accessible(ChevronLeftIcon);
export const ChevronRight = accessible(ChevronRightIcon);
export const CircleHelp = accessible(CircleHelpIcon);
export const ClipboardList = accessible(ClipboardListIcon);
export const Clock3 = accessible(Clock3Icon);
export const Compass = accessible(CompassIcon);
export const DatabaseBackup = accessible(DatabaseBackupIcon);
export const FileCheck2 = accessible(FileCheck2Icon);
export const HeartHandshake = accessible(HeartHandshakeIcon);
export const ImagePlus = accessible(ImagePlusIcon);
export const Leaf = accessible(LeafIcon);
export const LoaderCircle = accessible(LoaderCircleIcon);
export const LogIn = accessible(LogInIcon);
export const LogOut = accessible(LogOutIcon);
export const MapPin = accessible(MapPinIcon);
export const Menu = accessible(MenuIcon);
export const MessageCircle = accessible(MessageCircleIcon);
export const Pencil = accessible(PencilIcon);
export const Plus = accessible(PlusIcon);
export const RefreshCw = accessible(RefreshCwIcon);
export const RotateCcw = accessible(RotateCcwIcon);
export const Scale = accessible(ScaleIcon);
export const Search = accessible(SearchIcon);
export const SearchX = accessible(SearchXIcon);
export const Send = accessible(SendIcon);
export const ShieldCheck = accessible(ShieldCheckIcon);
export const SlidersHorizontal = accessible(SlidersHorizontalIcon);
export const Sparkles = accessible(SparklesIcon);
export const Upload = accessible(UploadIcon);
export const UserRound = accessible(UserRoundIcon);
export const X = accessible(XIcon);
