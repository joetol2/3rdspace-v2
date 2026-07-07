import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function ParallaxBg({ src, overlay }: { src: string; overlay: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);
  return (
    <div ref={ref} className="absolute inset-0 overflow-clip" aria-hidden="true">
      <motion.img src={src} alt="" style={{ y }} className="h-[130%] w-full object-cover object-center" />
      <div className={`absolute inset-0 ${overlay}`} />
    </div>
  );
}
