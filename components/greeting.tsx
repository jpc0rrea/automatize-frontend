import { motion } from "framer-motion";

export const Greeting = () => {
  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col items-center justify-center px-4 md:mt-16 md:px-8"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6"
        exit={{ opacity: 0, scale: 0.9 }}
        initial={{ opacity: 0, scale: 0.9 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        {/* Icon for light mode - azul violeta */}
        {/* biome-ignore lint/a11y/useAltText: Alt text provided */}
        <img
          alt="AutomatizeJá"
          className="block dark:hidden size-20"
          src="/logo/1.png"
        />
        {/* Icon for dark mode - gradient */}
        {/* biome-ignore lint/a11y/useAltText: Alt text provided */}
        <img
          alt="AutomatizeJá"
          className="hidden dark:block size-20"
          src="/logo/10.png"
        />
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-center font-serif italic font-medium text-2xl md:text-3xl text-primary"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        O alto nível exige precisão.
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 text-center text-lg text-muted-foreground md:text-xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        Como posso ajudá-lo hoje?
      </motion.div>
    </div>
  );
};
