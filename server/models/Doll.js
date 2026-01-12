export class Doll {
  constructor({ id, name, description, imageUrl, imagePrompt, generationMethod, blur, privacyApproved, createdAt }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.imageUrl = imageUrl;
    this.imagePrompt = imagePrompt;
    this.generationMethod = generationMethod;
    this.blur = blur;
    this.privacyApproved = privacyApproved;
    this.createdAt = createdAt;
  }
}
