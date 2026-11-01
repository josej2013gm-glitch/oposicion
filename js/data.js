const TEMAS = [
  {n:1,g:'I',t:'Constitución Española 1978: principios básicos. Derechos y deberes fundamentales, su garantía y suspensión. El Defensor del Pueblo. El Tribunal Constitucional. El recurso de amparo.'},
  {n:2,g:'I',t:'La Corona: carácter, sucesión, proclamación y funciones. Las Cortes Generales: composición y funciones del Congreso y el Senado. Clases de leyes, procedimiento de elaboración y aprobación. Regulación constitucional del Poder Judicial. La organización judicial española.'},
  {n:3,g:'I',t:'La Administración Pública en el Estado Español. Clases de Administraciones y principios de actuación. LO 4/1982, de 9 de junio, del Estatuto de Autonomía de la Región de Murcia: órganos institucionales y régimen jurídico.'},
  {n:4,g:'I',t:'La organización territorial del Estado. Concepto y elementos del municipio. El Ayuntamiento: composición y competencias. El Pleno, la Junta de Gobierno Local, el Alcalde, los Tenientes de Alcalde. La potestad normativa de las Entidades Locales: Ordenanzas, Reglamentos y Bandos.'},
  {n:5,g:'I',t:'El acto administrativo: concepto, elementos y clases. Eficacia y validez. La motivación. Actos nulos, anulables e irregulares. Notificación y publicación. El cómputo de plazos. El procedimiento administrativo: principios generales, clases y fases.'},
  {n:6,g:'I',t:'Los recursos administrativos: concepto, clases y régimen jurídico. El recurso contencioso-administrativo. El silencio administrativo.'},
  {n:7,g:'I',t:'Deberes de los empleados públicos. Código de conducta. Deberes y derechos de la Policía Local. Responsabilidad de la Policía Local. Situaciones administrativas.'},
  {n:8,g:'I',t:'LO 1/2004, de 28 de diciembre, de Medidas de Protección Integral contra la Violencia de Género: objeto y principios rectores. Derechos de las mujeres víctimas. Tutela institucional y penal. Especial referencia a las Fuerzas y Cuerpos de Seguridad.'},
  {n:9,g:'I',t:'LO 10/2022, de 6 de septiembre, de Garantía Integral de la Libertad Sexual: prevención, detección, sanción y erradicación de las violencias sexuales. Tratamiento de las víctimas y sus derechos. Actuación de las Fuerzas y Cuerpos de Seguridad.'},
  {n:10,g:'II',t:'LO 4/2000, de 11 de enero, sobre los Derechos y Libertades de los Extranjeros en España y su Integración Social: derechos y libertades de los extranjeros. Régimen jurídico.'},
  {n:11,g:'II',t:'LO 5/2000, de 12 de enero, reguladora de la Responsabilidad Penal de los Menores y su Reglamento de ejecución. Actuación policial con menores.'},
  {n:12,g:'II',t:'El modelo policial español y principios básicos de actuación en la LO 2/1986, de 13 de marzo, de Fuerzas y Cuerpos de Seguridad. Competencias de las FFCCSS del Estado y de las Policías Autonómicas. La Policía Local: concepto, naturaleza y funciones.'},
  {n:13,g:'II',t:'LO 4/2015, de 30 de marzo, de Protección de la Seguridad Ciudadana: actuaciones para el mantenimiento y restablecimiento de la seguridad ciudadana. Régimen sancionador: sujetos responsables, órganos competentes, infracciones y sanciones.'},
  {n:14,g:'II',t:'Ley 6/2019, de 4 de abril, de Coordinación de las Policías Locales de la Región de Murcia: disposiciones generales, funciones y órganos de coordinación, cuerpos de Policía Local. Régimen disciplinario: faltas, sanciones, prescripción y procedimiento disciplinario.'},
  {n:15,g:'II',t:'El uso de las armas de fuego por los miembros de las FFCCSS. Los principios de congruencia, oportunidad y proporcionalidad. La legítima defensa y el cumplimiento del deber. Asignación, tenencia, depósito y custodia del arma de fuego reglamentaria. Causas de retirada.'},
  {n:16,g:'II',t:'La detención: casos en que procede, requisitos, supuestos especiales. Derechos del detenido. Puesta a disposición judicial. Medidas cautelares y reales. El "Habeas Corpus".'},
  {n:17,g:'II',t:'La Policía Judicial: comprobación de delitos y averiguación del delincuente. Funciones de la Policía Local como Policía Judicial. El atestado policial: concepto, naturaleza y valor procesal. Requisitos de fondo y forma. Actuaciones sumariales.'},
  {n:18,g:'II',t:'Consideraciones sobre Derecho Penal y sus principios generales. Concepto de infracción penal: delitos leves, menos graves y graves. Los elementos del delito. Formas y grados de ejecución.'},
  {n:19,g:'II',t:'Personas criminalmente responsables de los delitos. Responsabilidad criminal y civil. Circunstancias modificativas de la responsabilidad criminal: eximentes, atenuantes y agravantes.'},
  {n:20,g:'II',t:'Las penas: concepto, fines, clases y efectos. Especial referencia a las penas privativas de libertad y formas sustitutivas.'},
  {n:21,g:'II',t:'Delitos contra la vida. El homicidio y sus formas. El aborto. Las lesiones. Especial referencia a violencia de género y doméstica.'},
  {n:22,g:'II',t:'Delitos contra la libertad. Detenciones ilegales y secuestros, amenazas, coacciones. Torturas y otros delitos contra la integridad moral. Especial referencia a delitos cometidos por autoridad o funcionario público. Trata de seres humanos.'},
  {n:23,g:'II',t:'Delitos contra la libertad sexual. Agresiones sexuales a menores de dieciséis años, acoso sexual, exhibicionismo y provocación sexual y corrupción de menores. Omisión del deber de socorro.'},
  {n:24,g:'II',t:'Allanamiento de morada, domicilio de personas jurídicas y establecimientos abiertos al público. La entrada y registro de locales. Delitos contra el honor. Delitos contra las relaciones familiares.'},
  {n:25,g:'II',t:'Delitos contra el patrimonio y el orden socioeconómico: hurtos, robos, extorsión, robo y hurto de uso de vehículos, usurpación, defraudaciones y daños. La receptación y conductas afines.'},
  {n:26,g:'II',t:'Delitos contra la Administración Pública. Atentados contra la autoridad, sus agentes y funcionarios públicos, y de la resistencia y desobediencia. De los desórdenes públicos. Tenencia, tráfico y depósito de armas, municiones o explosivos.'},
  {n:27,g:'II',t:'La conducción etílica: concepto de alcoholemia, tasas, efectos, obligación de someterse a la prueba, métodos de detección. Estupefacientes, psicotrópicos, estimulantes u otras sustancias análogas. Delitos contra la seguridad vial.'},
  {n:28,g:'III',t:'Texto Refundido de la Ley del Tráfico, Circulación de Vehículos a Motor y Seguridad Vial: ejercicio y coordinación de las competencias sobre tráfico y seguridad vial. Atribuciones de los municipios.'},
  {n:29,g:'III',t:'Procedimiento sancionador en materia de tráfico, circulación de vehículos a motor y seguridad vial. Actuación de los Agentes como denunciantes. Competencia sancionadora. Infracciones sancionadas por la Autoridad Municipal.'},
  {n:30,g:'III',t:'El Reglamento General de Circulación: ámbito de aplicación en el municipio. Elementos que intervienen en la circulación. Intervención de los Agentes de la Policía Local en la circulación.'},
  {n:31,g:'III',t:'El Reglamento General de Conductores: autorizaciones administrativas para conducir. Nulidad, lesividad y pérdida de vigencia. Obtención de nuevo permiso o licencia. Infracciones que llevan aparejada la pérdida de puntos.'},
  {n:32,g:'III',t:'El Reglamento General de Vehículos. Cuestiones fundamentales para la Policía Local. Requisitos que han de reunir los vehículos para circular por la vía pública: administrativos, técnicos y de identificación.'},
  {n:33,g:'III',t:'Transporte de mercancías y viajeros: principales preceptos contenidos en la normativa de Seguridad Vial. El transporte escolar y de menores. Transporte de mercancías peligrosas. Señalización.'},
  {n:34,g:'III',t:'Vehículos abandonados. Retirada de vehículos de la vía pública y tratamiento de vehículos abandonados en la normativa de seguridad vial, ordenanza municipal y en la Ley 7/2022 de residuos y suelos contaminados para una economía circular.'},
  {n:35,g:'III',t:'La intervención de la Policía Local en la aplicación de las ordenanzas municipales, así como en los espectáculos públicos, actividades recreativas y establecimientos públicos.'},
  {n:36,g:'III',t:'Ordenanza municipal para la protección animal. Real Decreto 287/2002, de 22 de marzo, por el que se desarrolla la Ley 50/1999, de 23 de diciembre, sobre el régimen jurídico de la tenencia de animales potencialmente peligrosos.'},
  {n:37,g:'III',t:'Ordenanza municipal de vados. Ordenanza reguladora de la ocupación de vía pública con terrazas de establecimientos de restauración.'},
  {n:38,g:'III',t:'Ordenanza reguladora de la actuación municipal en relación con la venta, dispensación y suministro de bebidas alcohólicas así como su consumo en espacios y vías públicas. Ordenanza municipal reguladora de la venta fuera del establecimiento comercial.'},
  {n:39,g:'III',t:'Ordenanza municipal de protección del medio ambiente contra la contaminación acústica: disposiciones generales. Emisión y control de ruido de vehículos y ciclomotores. Establecimientos de actividades recreativas y de ocio. Actividades industriales, comerciales y artesanales. Infracciones.'},
  {n:40,g:'III',t:'Ordenanza municipal de limpieza viaria y gestión de los residuos domésticos del Ayuntamiento de Cieza: gestión de residuos domésticos.'},
  {n:41,g:'III',t:'Callejero y edificios municipales, civiles y de administración y servicios del municipio de Cieza. Principales vías de comunicación.'},
];
const GRUPOS = {
  I: {label:'Grupo I', name:'Derecho Constitucional y Administrativo General y Policial', rng:'Temas 1–9'},
  II: {label:'Grupo II', name:'Derecho Penal, Derecho Procesal y Derecho Policial', rng:'Temas 10–27'},
  III: {label:'Grupo III', name:'Normativa de Tráfico y Normativa Municipal', rng:'Temas 28–41'},
};
const ESTADOS = ['Sin empezar','1ª Vuelta','2ª Vuelta','Consolidado'];
const REPASO_DIAS = [0,7,14,30,60];

const QUICK = [
  'Explica los derechos del detenido y el Habeas Corpus',
  '¿Cuál es la diferencia entre delito leve, menos grave y grave?',
  'Resume la LO 4/2015 de Seguridad Ciudadana',
  'Explica el atestado policial y su valor procesal',
  '¿Qué faltas y sanciones contempla la Ley 6/2019 de Policías Locales de Murcia?',
  'Diferencia entre eximentes, atenuantes y agravantes',
  'Explica las tasas de alcoholemia y la obligación de someterse a la prueba',
  'Analiza mi ritmo de estudio y dame recomendaciones para esta semana',
];


// Horas estimadas para alcanzar cada estado (0→1, 1→2, 2→3). Se usan en la proyección de ritmo.
const HORAS_PASO = {1:3, 2:2, 3:1.5};
const CONF_LBL = ['Sin valorar','1 · muy floja','2 · floja','3 · normal','4 · buena','5 · dominada'];
