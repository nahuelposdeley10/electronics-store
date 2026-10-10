import 'dotenv/config'
import mongoose from 'mongoose'

if (!process.env.MONGODB_URI) {
  console.log('MONGODB_URI no está configurada en este entorno.')
  process.exit(2)
}

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 6000 })
  const hello = await mongoose.connection.db.admin().command({ hello: 1 })
  const supported = Boolean(hello.setName || hello.msg === 'isdbgrid')
  console.log(supported
    ? 'MongoDB conectado: replica set o cluster compatible con transacciones.'
    : 'MongoDB conectado: servidor independiente, NO admite transacciones multidocumento.')
  process.exitCode = supported ? 0 : 2
} catch (error) {
  console.error('No se pudo verificar MongoDB:', error.name)
  process.exitCode = 2
} finally {
  await mongoose.disconnect()
}