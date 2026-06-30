import { Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import type { User } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/current-user.decorator';

import { CloudinaryService, UploadSignaturePayload } from './cloudinary.service';

@Controller('uploads')
export class CloudinaryController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post('signature')
  signature(): UploadSignaturePayload {
    return this.cloudinary.generateUploadSignature();
  }

  /**
   * Best-effort delete of an uploaded asset. Used when the farmer is forced to
   * retake (HF rejected the photo) or abandons before confirming, so we don't
   * leak orphaned Cloudinary assets. The publicId may contain slashes (folder
   * prefix), so it's captured as a wildcard param. The service enforces that an
   * asset already attached to another user's report cannot be deleted.
   */
  @Delete(':publicId(*)')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: User, @Param('publicId') publicId: string): Promise<void> {
    await this.cloudinary.destroy(publicId, user.id);
  }
}
