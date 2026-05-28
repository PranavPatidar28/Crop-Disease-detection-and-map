import { Controller, Post } from '@nestjs/common';

import { CloudinaryService, UploadSignaturePayload } from './cloudinary.service';

@Controller('uploads')
export class CloudinaryController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post('signature')
  signature(): UploadSignaturePayload {
    return this.cloudinary.generateUploadSignature();
  }
}
