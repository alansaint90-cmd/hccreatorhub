export const demoCampaigns = {
  "leve-lava": {
    brand: "Leve Lava",
    title: "Leve Lava — lavanderia",
    segment: "Lavanderia",
    niche: "Serviços e rotina",
    description:
      "Demonstração de uma campanha para uma lavanderia: praticidade, cuidado com as roupas e mais tempo para o dia a dia.",
    deliverables: "Um Reels mostrando a experiência na lavanderia e uma sequência de três Stories.",
    guidance: [
      "Apresentar a experiência de lavagem e o cuidado com as peças.",
      "Mostrar o ambiente, a organização e a praticidade do serviço.",
      "Usar apenas imagens autorizadas e identificar a publicação como publicidade.",
    ],
  },
  "brand-experience": {
    brand: "Brand Experience",
    title: "Brand Experience — beleza e autocuidado",
    segment: "Beleza e autocuidado",
    niche: "Beleza",
    description:
      "Demonstração de uma campanha de beleza e autocuidado, com foco em uma rotina de skincare e apresentação dos produtos.",
    deliverables: "Um Reels de rotina de autocuidado e três Stories apresentando os produtos.",
    guidance: [
      "Apresentar os produtos e a experiência pessoal de uso, sem prometer resultados.",
      "Priorizar luz natural, detalhes das texturas e uma rotina autêntica.",
      "Não fazer alegações médicas e identificar a publicação como publicidade.",
    ],
  },
  "lifestyle-movimento": {
    brand: "Lifestyle em Movimento",
    title: "Lifestyle em Movimento — corrida",
    segment: "Esporte e corrida",
    niche: "Corrida e bem-estar",
    description:
      "Demonstração de uma campanha de uma marca de corrida: movimento, rotina de treino e conexão com a comunidade esportiva.",
    deliverables: "Dois vídeos curtos sobre a rotina de corrida e uma sequência de Stories.",
    guidance: [
      "Compartilhar a rotina de corrida e a experiência com os produtos de forma autêntica.",
      "Gravar em local seguro, com imagens de movimento e detalhes do equipamento.",
      "Não prometer resultados físicos e identificar a publicação como publicidade.",
    ],
  },
} as const;
export type DemoCampaignKey = keyof typeof demoCampaigns;
