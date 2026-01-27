import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "",
    {
      text: "网站介绍",
      icon: "info",
      link: "/introduction/",
    },
    {
      text: "面试题库",
      icon: "majesticons:book-open",
      collapsible: true,
      prefix: "mst/",
      children: [
        {
          text: "AI",
          icon: "bxs:bot",
          collapsible: true,
          prefix: "AI/",
          children: [
            {
              text: "RAG",
              icon: "carbon:cloud-data-ops",
              collapsible: true,
              prefix: "RAG/",
              children: "structure"
            }
          ]
        },
        {
          text: "后端",
          icon: "line-md:clipboard-list-twotone",
          collapsible: true,
          prefix: "back/",
          children: "structure"
        },
        {
          text: "场景设计题库",
          icon: "eos-icons:system-image",
          collapsible: true,
          prefix: "design/",
          children: "structure"
        }
      ]
    },
    {
      text: "消息中间件",
      icon: "mdi:email-outline",
      collapsible: true,
      prefix: "message/",
      children: "structure"
    },
    {
      text: "Devops",
      icon: "line-md:briefcase-filled",
      collapsible: true,
      prefix: "devops/",
      children: "structure"
    },
    {
      text: "程序员进阶之路",
      icon: "eos-icons:enhancement",
      collapsible: true,
      prefix: "upgrade/",
      children: "structure"
    },
    {
      text: "AI应用开发",
      icon: "paintbrush",
      collapsible: true,
      prefix: "ai-dev/",
      children: "structure"
    },
    {
      text: "项目",
      icon: "rectangle-list",
      collapsible: true,
      prefix: "program/",
      children: "structure"
    },
    {
      text: "架构师",
      icon: "stash:balance-duotone",
      collapsible: true,
      prefix: "jiagou/",
      children: "structure"
    },
  ],
});