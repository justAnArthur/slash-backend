import { description, name, version } from "@/package.json"
import type { ElysiaSwaggerConfig } from "@elysiajs/swagger"

export default {
  documentation: {
    info: {
      title: name,
      description,
      version
    }
  }
} satisfies ElysiaSwaggerConfig
