import { IsString, IsUrl, MaxLength } from 'class-validator';

export class AnalyzeDiseaseDto {
  /** Cloudinary (or other public) URL of the captured leaf image. */
  @IsString()
  @IsUrl()
  @MaxLength(2048)
  imageUrl!: string;
}
