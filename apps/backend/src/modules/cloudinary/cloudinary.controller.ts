import { Controller, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

import { CloudinaryService, UploadSignaturePayload } from './cloudinary.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class CloudinaryController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post('signature')
  signature(): UploadSignaturePayload {
    return this.cloudinary.generateUploadSignature();
  }
}
