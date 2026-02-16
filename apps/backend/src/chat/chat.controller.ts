import { Body, Controller, Get, Post, Res} from '@nestjs/common';
import { ChatService } from './chat.service';
import {UIMessage} from 'ai';
import { Response } from 'express';

@Controller('chat')
export class ChatController {
    constructor(private chatService: ChatService){

    }

    @Get('models')
    async getModels() {
        return this.chatService.getModels();
    }

    @Post()
    async chat(
        @Body() body:{messages: UIMessage[]; model:string},
        @Res() res: Response
    ){
        await this.chatService.chat(body.messages, body.model, res)
    }
}
