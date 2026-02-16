import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModelMessage, UIMessage, convertToModelMessages, createGateway, streamText } from 'ai';
import { Response } from 'express';

@Injectable()
export class ChatService {
    constructor(private readonly configService: ConfigService) {}

    private getGateway() {
        const apiKey =
          this.configService.get<string>('AI_GATEWAY_API_KEY') ??
          this.configService.get<string>('VERCEL_API_SDK_KEY');

        if (!apiKey) {
            throw new InternalServerErrorException(
              'Missing AI gateway API key. Set AI_GATEWAY_API_KEY (or VERCEL_API_SDK_KEY).',
            );
        }

        return createGateway({ apiKey });
    }

    async getModels() {
        const gateway = this.getGateway();
        const { models } = await gateway.getAvailableModels();

        return models
          .filter((model) => model.modelType === 'language' || model.modelType == null)
          .map((model) => ({
            id: model.id,
            name: model.name ?? model.id,
          }))
          .sort((a, b) => a.id.localeCompare(b.id));
    }

    async chat(messages:UIMessage[], model: string, response: Response){
        if (!model?.trim()) {
            throw new BadRequestException('Model is required');
        }

        const gateway = this.getGateway();
        const modelMessage: ModelMessage[]=[...await convertToModelMessages(messages)];
        const result = streamText({model: gateway(model), messages: modelMessage});

        result.pipeUIMessageStreamToResponse(response)
    }
}
