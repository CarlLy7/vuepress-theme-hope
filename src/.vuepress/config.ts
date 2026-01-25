import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "Carl学习网站",
  description: "Carl的学习网站",

  theme,

  // Enable it with pwa
  // shouldPrefetch: false,
});
