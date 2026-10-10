import mongoose from 'mongoose'

const arcaCredentialSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    environment: { type: String, enum: ['homologation', 'production'], default: 'homologation' },
    cuit: { type: String, required: true },
    certificate: { type: String, required: true },
    privateKey: { type: String, required: true },
    defaultType: { type: String, enum: ['A', 'B', 'C'], default: 'B' },
    pointOfSale: { type: String, default: '' },
    enabled: { type: Boolean, default: false },
    lastTestAt: { type: Date, default: null },
    lastTestStatus: { type: String, enum: ['ok', 'error', null], default: null },
    lastError: { type: String, default: null },
  },
  { timestamps: true },
)

export const ArcaCredential = mongoose.model('ArcaCredential', arcaCredentialSchema)
