import { getCertificateByCode } from '@/lib/csvReader';
import { Metadata } from 'next';
import { FileText, Layers, Calendar, Check, Award } from 'lucide-react';
import { Poppins, Montserrat } from 'next/font/google';

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
});

const montserrat = Montserrat({
  weight: ['400', '500', '600', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
});

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const certData = await getCertificateByCode(resolvedParams.code);
  if (!certData) {
    return {
      title: 'Certificado Não Encontrado',
    };
  }
  return {
    title: `${certData.owner.name} - Certificado Tesouro Verde`,
  };
}

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = await params;
  const certData = await getCertificateByCode(resolvedParams.code);

  if (!certData) {
    return (
      <div className={`min-h-screen bg-[#fafaf9] flex items-center justify-center p-4 ${poppins.className}`}>
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-neutral-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-neutral-800 mb-2">Certificado não encontrado</h1>
          <p className="text-neutral-500 text-sm mb-6">
            O código do selo informado não foi localizado no nosso banco de dados. Verifique a URL e tente novamente.
          </p>
          <a href="/" className="inline-block bg-[#4c563e] text-white font-medium px-6 py-2.5 rounded-full text-sm hover:bg-[#3d4532] transition">
            Voltar ao Início
          </a>
        </div>
      </div>
    );
  }

  const { certificate, owner, certificationPeriod } = certData;
  const ucs = certificate.amount;



  return (
    <div className={`min-h-screen bg-[#fdfdfb] text-neutral-800 py-16 px-4 md:px-8 ${poppins.className}`}>
      <div className="max-w-5xl mx-auto">
        
        {/* Certificate Title / Owner Name */}
        <h1 className={`text-center text-2xl md:text-3xl font-bold tracking-widest text-[#4c563e] mb-12 uppercase ${montserrat.className}`}>
          {owner.name}
        </h1>

        {/* Logo and Metadata Block */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-12 md:gap-16 mb-16">
          
          {/* Logo Image */}
          <img 
            src="/image/Logo Tesouro Verde_04.png" 
            alt="Logo Tesouro Verde" 
            className="w-72 h-72 object-contain select-none shrink-0"
          />

          {/* Metadata Fields */}
          <div className="flex flex-col gap-6 w-full max-w-xl">
            
            {/* Field 1: Número do Selo */}
            <div className="flex gap-4 items-start">
              <div className="bg-[#4c563e] text-white p-2.5 rounded-full shrink-0 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#4c563e] uppercase tracking-wider">Número do Selo</span>
                <span className={`text-base md:text-lg text-neutral-700 font-medium break-all ${montserrat.className}`}>
                  {certificate.code}
                </span>
              </div>
            </div>

            {/* Field 2: ICRS */}
            <div className="flex gap-4 items-start">
              <div className="bg-[#4c563e] text-white p-2.5 rounded-full shrink-0 shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#4c563e] uppercase tracking-wider">ICRS (Índice de Conta de Retribuição Socioambiental)</span>
                <span className="text-base md:text-lg text-neutral-700 font-medium">
                  {ucs} UCS (Unidades de Crédito de Sustentabilidade)
                </span>
              </div>
            </div>

            {/* Field 3: Período da Certificação */}
            <div className="flex gap-4 items-start">
              <div className="bg-[#4c563e] text-white p-2.5 rounded-full shrink-0 shadow-sm">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#4c563e] uppercase tracking-wider">Período da Certificação</span>
                <span className="text-base md:text-lg text-neutral-700 font-medium">
                  {certificationPeriod.start} a {certificationPeriod.end}
                </span>
              </div>
            </div>

            {/* Field 4: Validade */}
            <div className="flex gap-4 items-start">
              <div className="bg-[#4c563e] text-white p-2.5 rounded-full shrink-0 shadow-sm">
                <Check className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#4c563e] uppercase tracking-wider">Validade</span>
                <span className="text-base md:text-lg text-neutral-700 font-medium">
                  {certificationPeriod.end}
                </span>
              </div>
            </div>

          </div>
        </div>



      </div>
    </div>
  );
}
