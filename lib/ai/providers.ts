import { gateway } from "@ai-sdk/gateway";
import { customProvider } from "ai";
import { modelConfig } from "@/lib/config";
import { isTestEnvironment } from "../constants";

/**
 * AI Provider for language models
 *
 * Model selection is abstracted from users - the system automatically
 * chooses the appropriate model for each task:
 * - chat-model: Main conversation model with vision capabilities
 * - title-model: Fast model for generating chat titles
 *
 * Image generation uses gateway.languageModel() directly in the tool
 * to properly support responseModalities for image output.
 */
export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        "chat-model": gateway.languageModel(
          `${modelConfig.chat.model}`
        ),
        "title-model": gateway.languageModel(
          `${modelConfig.title.model}`
        ),
      },
    });
