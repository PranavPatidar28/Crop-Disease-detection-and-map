import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

import type { Env } from '@/config/env.schema';
import { PrismaService } from '@/modules/prisma/prisma.service';

export interface UploadSignaturePayload {
  /** HMAC signature for the direct-upload request */
  signature: string;
  /** UNIX timestamp (seconds) used in the signature */
  timestamp: number;
  /** Cloudinary api key (safe to send to client) */
  apiKey: string;
  /** Cloudinary cloud name */
  cloudName: string;
  /** Folder reports are uploaded into */
  folder: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME', { infer: true }),
      api_key: this.config.get('CLOUDINARY_API_KEY', { infer: true }),
      api_secret: this.config.get('CLOUDINARY_API_SECRET', { infer: true }),
      secure: true,
    });
  }

  /**
   * Generates a short-lived signature so the client can upload directly to
   * Cloudinary's REST API without the api_secret leaving the server.
   */
  generateUploadSignature(): UploadSignaturePayload {
    const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME', { infer: true });
    const apiKey = this.config.get('CLOUDINARY_API_KEY', { infer: true });
    const apiSecret = this.config.get('CLOUDINARY_API_SECRET', { infer: true });
    const folder = this.config.get('CLOUDINARY_UPLOAD_FOLDER', { infer: true });

    const timestamp = Math.round(Date.now() / 1_000);

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
      },
      apiSecret,
    );

    return {
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
    };
  }

  /** Best-effort delete; logs and swallows Cloudinary errors so report deletion isn't blocked. */
  async destroy(publicId: string, userId: string): Promise<void> {
    // Bound the blast radius: only assets inside the configured upload folder
    // can be deleted via this path, so the public DELETE route can't remove
    // arbitrary Cloudinary assets.
    const folder = this.config.get('CLOUDINARY_UPLOAD_FOLDER', { infer: true });
    if (!publicId.startsWith(`${folder}/`)) {
      this.logger.warn(`Refusing to destroy "${publicId}": outside upload folder "${folder}"`);
      return;
    }

    // Ownership guard (IDOR): this endpoint exists to clean up ORPHANED uploads
    // (retake/abandon, before a report is created). If the asset is already
    // attached to a committed report, only its owner may delete it — otherwise
    // a farmer could enumerate publicIds from the public /reports/nearby feed and
    // destroy other farmers' images. An orphan (no report row) is safe to delete.
    const owningReport = await this.prisma.report.findFirst({
      where: { imagePublicId: publicId },
      select: { userId: true },
    });
    if (owningReport && owningReport.userId !== userId) {
      this.logger.warn(`Refusing to destroy "${publicId}": belongs to another user's report`);
      throw new ForbiddenException('You do not have access to this asset');
    }

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      this.logger.warn(`Cloudinary destroy failed for ${publicId}: ${(err as Error).message}`);
    }
  }
}
