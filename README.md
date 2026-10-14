# Ceniza

Juego de supervivencia zombi para navegador con cámara en tercera persona sobre el hombro. Mundo infinito generado por chunks, casas con interiores y combate cuerpo a cuerpo inspirado en los clásicos del género. Funciona en PC, en móvil y con mando.

> "Ceniza" es un nombre provisional. Es un proyecto inspirado en el género de supervivencia; todo el arte, el código y los nombres son propios.

## Estado

**Bloque 1: base y zombis lentos**
- Zombis lentos que caminan al azar; te persiguen si te ven de frente o si corres cerca

**Bloque 2: mundo infinito**
- Chunks de 32x32 que se generan al acercarte; lo que dejas atrás se conserva
- Los zombis lejanos se duermen y despiertan donde los dejaste

**Bloque 3: tercera persona, casas y combate**
- Cámara sobre el hombro que se acerca al apuntar y no atraviesa paredes, techos ni puertas
- Gráficos más suaves: personajes redondeados con esqueleto, sombras, niebla, texturas de suelo, techos a dos aguas
- Paredes finas entre casillas, como en el original
- 5 tipos de vivienda (4 casas y una cabaña) con varias habitaciones, girados hacia la calle
- 3 edificios raros: estación de bomberos, comisaría y hospital (en torno al 1,5 % de los edificios)
- Puertas que se abren y cierran, ventanas que se abren y por las que se puede saltar, vallas que se saltan
- Interruptor de luz en cada habitación y lámparas de techo que iluminan de verdad
- Farolas, aceras con bordillo, árboles y pinos grandes, arbustos
- 23 armas cuerpo a cuerpo repartidas por las casas según la habitación
- Combate: apuntar, golpes múltiples, críticos, derribos, empujón, pisotón, ataque al suelo, remate con cuchillo, desgaste y rotura de armas
- Zombis que agarran, arañan, hacen laceraciones y muerden; los mordiscos infectan. Si te rodean cuatro, te derriban
- Los zombis golpean puertas hasta romperlas, rompen ventanas y trepan por ventanas y vallas

**Bloque 3.1: sigilo y objetivo**
- Agacharse: andas más despacio, no haces ruido al caminar y tus golpes y puertas suenan a la mitad
- De pie te ven a 14 m al instante; agachado solo a 6 m y tardan cerca de un segundo en notarte (de muy cerca, al momento)
- Caminando de pie te oyen solo a 2 m (a tu espalda); agachado, nada. Correr te levanta y se oye a 7 m
- Si un zombi ya te persigue, agacharte no lo despista: primero rompe su línea de visión
- Contorno amarillo en el zombi al que apuntas (en móvil, en el que tienes a tu alcance delante)

**Bloque 3.2: animaciones y armas**
- Animaciones más fluidas y rápidas: transiciones suaves entre poses, golpes que aceleran hasta el impacto, cadera y hombros que se balancean, respiración en reposo, cabeza que compensa el giro
- Agarre a una o dos manos: un arma corta a dos manos hace un 15 % más de daño; una larga con una mano hace un 25 % menos, es más lenta y solo golpea a un zombi
- Armas largas: máximo 2, una en las manos y otra a la espalda (se ve en el personaje). Armas cortas: en los bolsillos, sin límite
- Soltar el arma de las manos

**Bloque 3.3: controles y más**
- HUD al estilo de los shooters de móvil: vida (línea blanca) y armas abajo al centro, joystick fijo con bloqueo de carrera, botones con iconos, botón contextual Abrir/Cerrar/Encender/Coger, Empujar junto a Atacar
- Pecho a tierra: te arrastras despacio, no haces ruido y solo te ven a 3,5 m (y tardan más en notarte). Tumbado no puedes atacar y te muerden con más facilidad
- Movimiento omnidireccional: correr y caminar en cualquier dirección con inercia; al apuntar, el torso mira al frente y la cadera gira hacia donde vas (también hacia atrás)
- Tras un empujón el zombi tarda 2 segundos más en levantarse
- Remate en el suelo: al golpear a un zombi caído, el personaje se acerca, se arrodilla y golpea, con plano de cine
- Agarre a dos manos con la mano izquierda realmente sobre el mango
- El metal pega un 12 % más; la madera un 10 % menos
- Muchos menos zombis: el 12 % de los chunks tiene una horda como antes; el resto, muy pocos. Muchos aparecen dentro de las casas y no salen de su habitación hasta oír un ruido o verte
- Ventanas: se abren y se cierran con Abrir; se salta por ellas con Saltar

**Bloque 3.4: esqueleto nuevo**
- 22 huesos (antes 17): columna en tres tramos, clavículas y dedos del pie. Sin dedos de la mano ni cara
- Piel suavizada: codos, rodillas, hombros, cadera y cintura se doblan repartidos entre dos huesos, sin cortes
- Las animaciones usan los huesos nuevos: la espalda se curva por tramos, los hombros acompañan al estirar, empujar y apuntar, y el pie rueda al pisar
- Nombres de huesos fáciles de emparejar con esqueletos estándar (por ejemplo Mixamo) si algún día se usan modelos externos

**Bloque 3.5: cámara, movimiento y combate de supervivencia moderna**
- Cámara más cerca y al hombro, con el personaje a la izquierda del encuadre (inspirada en el vídeo de referencia, sin copiar)
- Caminar hacia atrás sin darse la vuelta: el personaje retrocede mirando al frente; corriendo sí gira
- Agachado más bajo y natural, carrera con el torso inclinado
- Más polígonos: el jugador pasa a unos 6800 triángulos (pecho, omóplatos, orejas, cejas, manos con pulgar, suelas, mochila con saco de dormir) y los zombis a unos 7300 de cerca; de lejos usan una malla de unos 3300 para no perder fluidez
- Infectados con hongos: unos tienen bultos en la cabeza, el cuello y los hombros, y algunos una placa de hongo que les tapa media cara. Sufren espasmos (sacudidas secas de cabeza y hombros)
- Combo de 3 golpes: pulsa atacar otra vez durante un golpe. Con armas largas a dos manos: golpe, revés y un golpe fuerte por encima de la cabeza; con cuchillos: puñalada, tajo y puñalada
- El tercer golpe pega un 25 % más y derriba más
- Paso adelante al golpear si el zombi está algo lejos
- Esquivar (R, RB o botón Esquivar): un paso rápido de 1,6 m hacia donde muevas el joystick (sin dirección, hacia atrás). Si esquivas justo cuando un zombi te agarra, falla y se queda vendido 1,4 s: el contraataque pega más y derriba más
- Los zombis avisan más antes de agarrar (casi un segundo con los brazos estirados), para que se pueda leer y esquivar
- Golpes con peso: un instante de cámara lenta al acertar y una pequeña sacudida de cámara; el zombi se dobla hacia el lado del golpe
- **Editar botones** (en el menú y en la pausa, solo en móvil): arrastra cualquier botón, el joystick o el panel de vida y armas; con − y + cambias el tamaño del elegido. Se guarda en el teléfono; "Restablecer" vuelve a la disposición original

**Bloque 3.6: armas de fuego, arco y agarre por la espalda**
- 4 armas nuevas, imitadas (sin copiar) de los vídeos de referencia: pistola semiautomática, escopeta de corredera, rifle de cerrojo con mira telescópica y arco
- Munición que se encuentra en las casas: balas de 9 mm, cartuchos, balas de rifle y flechas; y un silenciador para la pistola (V lo pone y lo quita; aguanta 20 disparos)
- Se dispara apuntando: la cámara se acerca al hombro y aparece una retícula que se abre al moverte y al disparar y se cierra si te quedas quieto. Sin apuntar, atacar da un culatazo
- Animaciones: pistola baja a un lado al caminar y a dos manos al apuntar; escopeta y rifle cruzados delante del cuerpo y con la culata al hombro al apuntar; retroceso, corredera de la escopeta, cerrojo del rifle, recarga de la pistola (cargador y corredera), de la escopeta cartucho a cartucho y del rifle bala a bala; el arco se tensa hasta la cara y la mano va al carcaj por la siguiente flecha. Las manos siguen al arma de verdad (IK en los dos brazos) y el torso sigue la mirada arriba y abajo
- Disparo a la cabeza: triple de daño. A las piernas: derriba más. La escopeta suelta 7 perdigones y pierde fuerza a partir de 6 m. El rifle mata casi siempre de un tiro
- Las balas las paran paredes y puertas cerradas. Fogonazo con luz, estela de la bala, sangre y polvo al impactar, sacudida de cámara y la mira sube un poco con cada disparo
- Los disparos se oyen lejos (pistola 30 m, escopeta 38 m, rifle 45 m) y atraen a los zombis. El arco y la pistola con silenciador casi no hacen ruido
- Las flechas vuelan con caída; muchas se recuperan del suelo o del cadáver
- Mira telescópica del rifle: al apuntar, zoom fuerte con visor
- Recarga con R (o empujar mientras apuntas en el mando). Con escopeta y rifle puedes disparar a mitad de recarga. Si pides recargar durante la corredera, recarga al terminar
- Agarre por la espalda: acércate por detrás a un zombi que no te ha visto y pulsa Empujar (el botón cambia a "Agarrar" y se marca en amarillo). Con un cuchillo encima: tres puñaladas al cuello. Sin cuchillo: lo estrangulas (más lento)
- Botón Recargar en móvil (también se puede mover con el editor) y munición encima de las armas
- Cambio de teclas: esquivar pasa a la F; la R es recargar

**Bloque 4: casas de dos pisos, muebles, tiendas y corredores**
- 3 modelos nuevos de casa de dos pisos, repartidos al azar: escalera de verdad (se sube y se baja andando), dormitorios, baño y estudio arriba, barandilla en el hueco de la escalera y ventanas en las dos plantas. Los zombis también suben y bajan, y los ruidos se oyen peor de una planta a otra
- Muebles en todas las casas y edificios: camas, mesitas, cómodas, armarios, sofás, mesas, cocina completa, nevera, baño, estanterías, bancos de trabajo, escritorios, archivadores, taquillas... Bloquean el paso y la cámara los tiene en cuenta
- Registrar: acércate a un mueble con cajones o puertas y pulsa Registrar (E). El personaje rebusca (agachado si es bajo) y encuentras lo que haya: la munición va directa a la mochila y las armas quedan delante para cogerlas. Casi todo el botín está ahora dentro de los muebles
- Comisaría: en la oficina hay un armero con escopeta de corredera y pistola siempre, y un 12 % de rifle (más munición)
- Casas de dos pisos: algo más de probabilidad de encontrar una pistola
- Tiendas de comida (todavía sin comida): escaparate, toldo a rayas, cartel con nombre, góndolas, neveras, mostrador con caja (a veces con una pistola debajo) y almacén
- Edificios especiales que se reconocen de lejos: cartel de BOMBEROS con portones abiertos, dos camiones de bomberos viejos dentro (ruedas pinchadas, óxido) y una torre; POLICÍA con franja azul, mástil y coche patrulla aparcado (se puede registrar el maletero); HOSPITAL con marquesina, cruz roja en el tejado y ambulancia
- Camiones de bomberos: tienen un cofre en el lateral con un hacha de bombero
- Ataque en carrera (como en el vídeo de referencia): corriendo, atacar hace que el personaje se lance con el arma arriba y descargue el golpe al llegar. Hace más daño y casi siempre derriba; con cuchillo se clava en la cabeza; sin arma es un placaje
- Agarrar por la espalda ahora va en el botón de Atacar (que se ilumina y pone "Agarrar")
- Corredores: uno de cada cuatro zombis es agresivo. Ve más lejos, te nota antes, se para a chillar al verte (y avisa a los de alrededor), corre casi como tú, encorvado y agitando los brazos, y se abalanza para agarrarte. Tienen algo menos de vida. El resto siguen siendo lentos
- Esqueleto con 24 huesos: un hueso para los dedos de cada mano, que se cierran sobre el arma, se abren al empujar o rebuscar y hacen garras en los zombis

**Bloque 5: menú de botín, rendimiento y vegetación**
- Menú de botín al estilo de los shooters de móvil: al registrar un mueble se abre un panel con lo que hay dentro, en tarjetas de dos columnas con su icono (sacado del modelo 3D), nombre y cantidad. Toca una para cogerla o "Coger todo". Si ya llevas dos armas largas, la que tenías se queda dentro del mueble (cambio). Se cierra con la X, con E/Esc o al alejarte
- Lo que registras se queda registrado: después el mueble pone "Abrir (n)" y se abre al momento; vacío ya no sale. Al salir de una casa y volver, el botín sigue igual (los muebles y lo que tienen dentro son datos del mundo; solo se ocultan sus modelos)
- En el suelo solo se ven las armas de fuego largas (escopeta, rifle, arco) y las flechas disparadas. Las armas cuerpo a cuerpo, la pistola y la munición se encuentran dentro de muebles. Lo que sueltas (G) que no sea un arma de fuego larga queda en un "montón" que se abre con el mismo menú
- El hacha de bombero solo está en los cofres de los camiones de bomberos. La palanca inicial está dentro de un mueble de la sala
- Fuera la mecánica de una o dos manos y el límite de las armas cortas: con dos largas a la espalda puedes seguir usando las cortas. V (LB) ahora es el accesorio: silenciador en la pistola y mira del rifle
- Rifle: el primer toque de Apuntar apunta normal; el segundo pone la mira telescópica (en PC, rueda o V apuntando)
- Arco: postura de tiro nueva. Cadera y torso de perfil, brazo izquierdo estirado hacia el blanco, cuerda hasta la barbilla y codo derecho atrás a la altura del hombro
- Las luces de las habitaciones salen encendidas o apagadas al azar (fuera los interruptores, de momento)
- Calidad gráfica en el menú de inicio y en la pausa: Auto, Baja, Media y Alta (se guarda en el teléfono). Auto empieza en Media en móvil y Alta en PC y baja sola si el juego va por debajo de ~24 fps. Opción "Limitar a 30 fps"
- Optimización: las zonas nuevas se construyen por partes, unos milisegundos por fotograma (sin tirones); muebles y tabiques no proyectan sombra y solo se dibujan si estás dentro de la casa o cerca; menos luces a la vez en calidades bajas; zombis con 3 niveles de detalle, sin sombra a partir de cierta distancia y animados cada 2 o 3 fotogramas cuando están lejos. En la casa inicial se pasa de unos 535 000 a unos 225 000 triángulos y de 185 a 105 llamadas de dibujo
- `?debug` ampliado: fps, llamadas de dibujo, triángulos y milisegundos por fotograma de lógica, zombis, mundo y dibujo
- Vegetación nueva: árboles con tronco y ramas en 3D y hojas en láminas con transparencia; pinos con pisos de ramas; arbustos de láminas cruzadas; todo se mece con el viento. De lejos cada árbol pasa a ser una sola lámina que mira a la cámara
- Hierba alta al estilo PUBG Mobile, en manchas por el césped y sobre todo fuera del pueblo. Se encoge a lo lejos (20 a 30 m según la calidad) y su densidad depende de la calidad
- Esconderse en la hierba alta: tumbado dentro, los zombis solo te ven casi encima; agachado, mucho más cerca de lo normal; de pie no te tapa. Moverte por ella hace un leve roce. El HUD muestra "Oculto en la hierba"

**Bloque 5.1: sin resistencia, armas duraderas y botín sin repetir**
- Fuera la resistencia: correr, golpear y empujar ya no cansan (desaparece la barra y el estado "Agotado"). Correr sigue haciendo ruido
- Las armas cuerpo a cuerpo duran 5 veces más (un bate aguanta unos 900 golpes de media)
- No salen armas que ya llevas: al abrir un mueble por primera vez, las armas que tienes en el inventario no aparecen. Si eran fijas del mueble (la escopeta y la pistola del armero de la comisaría, el hacha del cofre del camión) quedan con un 12 % de probabilidad. Las armas de fuego largas del suelo tampoco salen si ya tienes una igual. La munición sí sigue saliendo
- Casas de una planta: menos pistolas y munición (un 40 % de lo que había). En las de dos pisos se mantiene igual

**Bloque 6A: inventario, mochila, curación, HUD nuevo y ventanas**
- Espacios de armas: 1 cuerpo a cuerpo (de cualquier tamaño), 1 pistola y 2 armas de fuego largas a la espalda. Con mochila, 2 armas largas más guardadas. Ya no se sueltan armas
- Si no te cabe un arma (o ya la tienes), no aparece al registrar; un arma de fuego rota sí se cambia por una nueva (la rota se queda en el mueble)
- Durabilidad real: cada golpe que acierta gasta uno. Tabla 4, palo de golf 5, cuchillo 5, bate 8, palanca 12, hacha de bombero 13 (y mata casi siempre de un golpe). Al romperse, las cuerpo a cuerpo desaparecen
- Armas de fuego con desgaste por disparo (pistola 150, escopeta 80, rifle 70, arco 120). Rotas no disparan pero se quedan; se podrán arreglar en un banco de taller más adelante
- Navaja de sigilo siempre a mano (no ocupa espacio ni se gasta): agarrar por la espalda siempre es con tres puñaladas
- Botín más escaso: fuera el 100 % del armero de la comisaría (pistola 60 %, escopeta 30 %, rifle 6 %); armas de fuego largas unas 3 veces más raras; munición de pistola más rara. Cada hallazgo de munición trae como mucho 6 (pistola 2-6, cartuchos 1-4, rifle 1-3, flechas 1-3)
- Límite de munición en reserva: sin mochila 10 balas de pistola, 5 cartuchos, 5 de rifle y 5 flechas; con mochila, el triple. Lo que no te cabe se queda en el mueble
- Mochila: empiezas sin ella. Se encuentra en armarios, taquillas, cajas, bancos de trabajo y estantes (deja de aparecer cuando la llevas). Se ve en la espalda y las armas se reubican
- Vendas (en baños, dormitorios, hospital, ambulancias): cortan el sangrado y evitan la infección de rasguños y laceraciones si te vendas en el primer minuto. Vendarse tarda 2,5 s y te deja quieto (un golpe lo corta). Los mordiscos siguen sin cura
- Alcohol (más raro; baños, cocinas, hospital): necesita mochila; cada botella trae 2-4 usos
- Fabricar en la mochila (mantener pulsado): venda + alcohol = venda desinfectada, que además recupera unos 30 puntos de vida en un minuto
- Sin tratamiento la vida solo vuelve sola hasta la mitad, despacio
- Menú de la mochila (se abre con un toque, el personaje se agacha a rebuscar y el mundo sigue): armas a mano y guardadas (toca una y luego otra para cambiarlas, o arrástrala), materiales y objetos (usar), descripción y fabricar. La munición no está ahí, está en el indicador de combate
- HUD nuevo al estilo de los juegos de referencia: un indicador con el icono blanco del arma, la munición "cargador | reserva" (en ámbar si está llena), rayitas del cargador o de los golpes que quedan, y la vida como un arco (rojo y latiendo si sangras). Tocarlo = cambio rápido al arma anterior; mantener y deslizar = selector de armas y vendas. Se puede mover con el editor de botones
- Iconos blancos generados de los modelos 3D para el HUD y la mochila (el menú de botín sigue a color)
- Botón ∆ aparte para registrar y abrir o cerrar el menú de botín; el botón de la puerta queda solo para puertas y ventanas; saltar vallas y ventanas solo con Saltar (se ilumina cuando hay algo que saltar)
- Opción "Abrir puertas al correr" (inicio y pausa): corriendo, las puertas se abren de un empujón (más ruido) y las ventanas abiertas o rotas y las vallas se saltan sin frenar
- Ventanas rompibles: un disparo o una flecha rompe el vidrio; un golpe o un codazo de frente también. Se oye a unos 14 m. Una ventana rota tiene vidrios: saltar por ella puede cortarte (rasguño o laceración). Quítalos con el botón de la puerta ("Quitar los vidrios") o con un golpe
- Fuera la resistencia (bloque 5.1) y la durabilidad x5 (sustituida por los golpes reales)

**Bloque 6B: terreno con lomas**
- Fuera del pueblo, lomas de 4 a 8 m y algún cerro de hasta unos 6 m más, con pequeñas irregularidades en todas partes. La mayoría de las cuestas son suaves (la mitad del campo tiene menos de 4°, casi todo menos de 20°, y las más empinadas rondan los 30°)
- En el pueblo, casi plano: 1 o 2 m de diferencia de punta a punta. Las calles y aceras siguen el terreno
- Cada edificio tiene una base nivelada a la altura media del terreno; donde el suelo queda más bajo se ve un zócalo, y la entrada tiene escalones si hace falta. Alrededor de la casa el terreno se nivela (una casilla) y luego hace una transición
- Todo sigue la altura del suelo: jugador, zombis, objetos, árboles, arbustos, hierba, vallas, farolas y vehículos
- Cuesta arriba se camina más despacio (hasta la mitad en las más empinadas)
- Las lomas tapan la vista: un zombi al otro lado de una loma no te ve (tumbado o agachado te tapa antes). Las balas y flechas chocan con el terreno, y la cámara no se mete dentro de una loma
- Las lomas proyectan sombra (fuera del pueblo)

**Bloque 6C: cobertura y protagonista más detallado**
- Cobertura automática (sin botón): agachado a menos de medio metro de una pared, una puerta cerrada, una valla, una barandilla o una ventana, el personaje se pega a ella con el hombro y avanza de costado, mirando a lo largo de la pared. Empujar el joystick lejos de la pared, levantarte o correr te despega
- En una esquina se para y se asoma (torso y cabeza salen por el borde); si sigues empujando medio segundo, sale
- Apuntar en cobertura: tras una cobertura baja (valla, ventana) te incorporas lo justo para disparar por encima; en la esquina de una pared alta sales de lado para disparar y vuelves a cubrirte al dejar de apuntar
- La cámara se pasa al otro hombro cuando la pared queda a su lado, para que nunca te tape la vista
- Sigilo: agachado en cobertura detrás de una valla o un muro bajo, un zombi del otro lado solo te ve a un tercio de la distancia normal (las paredes altas ya tapan la vista del todo)
- El protagonista pasa de unos 6800 a unos 12 000 triángulos, puestos en la silueta, las articulaciones y la ropa: chaqueta con faldón, dobladillo, cremallera, bolsillos, solapas y capucha recogida detrás del cuello; espalda en V y omóplatos; hombros y pliegues de codo; mangas arremangadas; rodillas del pantalón; botas altas con cordones; pistolera en el muslo y funda de la navaja. Manos, pies y cara casi iguales

**Bloque 6.1: HUD agresivo y sin cobertura**
- Cobertura desactivada por ahora (trababa al personaje). El código queda en `src/player.js` (`COVER_ON`) para retomarla más adelante
- Selector de armas nuevo en cruz, pequeño, al estilo de los juegos de referencia: a la izquierda las armas de fuego largas, a la derecha las cortas (pistola), arriba las vendas y vendas desinfectadas, abajo el arma cuerpo a cuerpo y las manos libres (y lo que se añada más adelante). Mantén el indicador y desliza hacia un brazo de la cruz: la dirección elige el brazo y la distancia, la casilla; al soltar se elige. Arriba se ve el nombre de lo marcado. En PC, mantén Q y mueve el ratón
- Indicador de combate más compacto en este modo
- Opción en el inicio y en la pausa: HUD "Agresivo" (el nuevo, por defecto) o "Clásico" (el selector en dos columnas del bloque 6). Se guarda en el navegador

## Controles

| Acción | Teclado y ratón | Móvil | Mando |
|---|---|---|---|
| Mover (en cualquier dirección) | WASD | Joystick fijo a la izquierda | Stick izquierdo |
| Mirar | Ratón (clic para capturarlo) | Arrastrar a la derecha (también desde Atacar y Empujar) | Stick derecho |
| Correr | Shift | Arrastra el joystick hasta Correr (se queda corriendo) o toca Correr | L3 |
| Apuntar | Mantener clic derecho | Botón de mira (activa y desactiva) | LT |
| Mira telescópica del rifle | Apuntando: rueda o V | Toca Apuntar otra vez | Apuntando: LB |
| Atacar | Clic izquierdo | Botón grande | RT |
| Empujar / pisotear | Espacio | Empujar | X |
| Agarrar por la espalda (zombi desprevenido) | Clic izquierdo | Agarrar (sale en Atacar) | RT |
| Ataque en carrera | Correr + clic izquierdo | Correr + Atacar | L3 + RT |
| Registrar o abrir un mueble / montón, coger del suelo | T (abre y cierra el menú de botín) | Botón ∆ | A |
| Coger del menú de botín | Clic en la tarjeta · "Coger todo" | Toca la tarjeta | — |
| Cerrar el menú de botín | T, Esc o X (o alejarte) | ∆ o X (o alejarte) | A |
| Mochila (armas guardadas, vendas, fabricar) | I | Botón de la mochila (abajo a la izquierda) | Select |
| Vendarse | B (la desinfectada si la tienes) | Mantén el indicador de arma y desliza hasta la venda | — |
| Esquivar | F | Esquivar | RB |
| Disparar (armas de fuego y arco) | Apuntar + clic izquierdo | Mira + Atacar | LT + RT |
| Recargar | R | Recargar | X apuntando |
| Poner o quitar el silenciador | V | — (se pone solo al cogerlo) | LB |
| Combo | Clic izquierdo otra vez durante el golpe | Atacar otra vez | RT otra vez |
| Abrir y cerrar puertas y ventanas, quitar vidrios | E | Botón con la puerta (aparece al acercarte) | A |
| Saltar (vallas y ventanas abiertas o rotas) | X | Saltar (se ilumina) | — |
| Agacharse (junto a una pared o valla: cobertura) | C | Agacharse | R3 |
| Pecho a tierra | Z | Pecho a tierra | B |
| Cambio rápido al arma anterior | Q (tocar) | Toca el indicador de arma | — |
| Selector de armas (cruz: izquierda largas, derecha cortas, arriba vendas, abajo cuerpo a cuerpo) | Mantén Q y elige moviendo el ratón | Mantén el indicador y desliza | — |
| Elegir arma | 1 cuerpo a cuerpo, 2 pistola, 3 y 4 largas · Tab o rueda pasa | — | Y |
| Pausa | Esc o P | Engranaje | Start |

La mochila (abajo a la izquierda en móvil) todavía no tiene función. Para cambiar la posición o el tamaño de los botones en móvil: "Editar botones" en el menú o en la pausa.

## Armas

Contundentes largas: bate, bate con clavos, palo de golf, mazo, pala, tabla, tabla con clavos.
Contundentes cortas: palanca, martillo, llave inglesa, sartén, tubo de plomo, rodillo, porra policial.
Hachas: hacha de bombero, hacha de mano. Hojas largas: machete, katana.
Hojas cortas: cuchillo de cocina, cuchillo de caza, destornillador, cuchilla de carnicero. Lanza improvisada.
De fuego: pistola semiautomática (corta, va al bolsillo), escopeta de corredera, rifle de cerrojo y arco (largas, a la espalda).

Espacios: 1 arma cuerpo a cuerpo (cualquiera), 1 pistola y 2 armas de fuego largas a mano; con mochila, 2 armas largas más guardadas. No se sueltan. Las cuerpo a cuerpo se rompen tras sus golpes y desaparecen; las de fuego se rompen y se quedan (inservibles hasta poder arreglarlas). Sin arma solo puedes empujar y pisotear; agarrar por la espalda siempre es con la navaja.

Dónde buscar (casi todo dentro de muebles): pistolas y munición de 9 mm en mesitas, escritorios, mostradores y comisarías; escopetas en comisarías y maleteros de patrulla; rifles, arcos y flechas sobre todo en cabañas y garajes; el hacha de bombero, en los cofres de los camiones de bomberos; vendas en baños, hospital y ambulancias; alcohol en baños, cocinas y hospital; la mochila en armarios, taquillas, cajas y talleres.

## Cómo probarlo

Abre `index.html` en el navegador (necesita conexión para cargar Three.js desde el CDN).

Opciones en la dirección (se pueden combinar con `&`):
- `?debug` muestra fotogramas, llamadas de dibujo, triángulos, chunks, zombis, la semilla y los milisegundos de cada parte (lógica, zombis, mundo, dibujo)
- `?seed=123` repite el mismo mundo
- `?armas` pone las armas de fuego largas junto al inicio y todo lo demás (cuerpo a cuerpo, pistola, munición, silenciador) en un montón
- `?calidad=baja` (o `media`, `alta`) fuerza esa calidad sin guardarla

## Publicar en GitHub Pages

1. Sube todos los archivos a la raíz del repositorio, con la carpeta `src`.
2. En el repositorio: Settings, Pages, Source "Deploy from a branch", rama `main`, carpeta `/ (root)`.
3. En uno o dos minutos estará en `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/`.

## Estructura

```
index.html        página, HUD y controles táctiles
style.css         estilos
src/
  util.js         ayudas (aleatorio con semilla, ángulos, colores)
  quality.js      calidad gráfica (Baja, Media, Alta, Auto) y límite de 30 fps
  mesher.js       une muchas piezas en una sola malla
  buildings.js    plantillas de edificios por habitaciones
  weapons.js      las 23 armas y qué aparece en cada habitación
  furniture.js    muebles y vehículos: colocación, modelos y lo que hay dentro
  world.js        chunks infinitos, plantas, escaleras, paredes, colisiones, línea de vista, rutas
  vegetation.js   árboles, pinos, arbustos y hierba alta (láminas con transparencia y viento)
  worldview.js    modelos 3D del mundo por etapas, puertas, ventanas, luces, interiores
  models.js       personajes con esqueleto, animaciones y modelos de armas
  input.js        teclado, ratón, táctil y mando
  camera.js       cámara en tercera persona
  player.js       jugador: movimiento, heridas, armas
  zombie.js       zombi: sentidos, persecución, puertas, golpes recibidos
  population.js   zombis por chunk: crear, dormir y despertar
  combat.js       combate cuerpo a cuerpo, agarre por la espalda
  guns.js         armas de fuego y arco: disparos, flechas, munición, efectos
  interact.js     puertas, ventanas, vallas, muebles, montones y armas del suelo
  icons.js        iconos sacados de los modelos 3D (a color y en blanco)
  loot.js         menú de botín
  hud.js          indicador de combate (arma, munición, vida) y selector de armas
  backpack.js     mochila: armas guardadas, objetos y fabricar
  hudedit.js      editor de botones (mover y cambiar tamaño, guardado en el teléfono)
  main.js         bucle principal, luces, HUD
```

## Ajustes rápidos

- Dificultad de los zombis: constantes al inicio de `src/zombie.js` (vida, velocidad, visión)
- Armas: tabla al inicio de `src/weapons.js` (daño, alcance, velocidad, golpes que aguanta en `cond`, disparos que aguanta en `shots`); multiplicador general: `DURABILITY`; cuántas pistolas y munición quedan en las casas de una planta: `COMMON_KEEP`
- Munición: `AMMO` en `src/weapons.js` (`box` = cuánta trae lo que encuentras, `cap` = cuánta cabe sin mochila; con mochila `BAG_MUL` veces más); vendas y alcohol: `SUPPLY`; dónde salen: `SUPPLIES` en `src/furniture.js`
- Curación: `wound`, `startBandage`, `finishBandage` y la vida que vuelve sola (hasta 50) en `src/player.js`
- Armas de fuego: tabla de `src/weapons.js` (daño, cargador, cadencia, recarga, dispersión, ruido); retroceso de la mira y sacudida en `KICK` y `SHAKE` de `src/guns.js`; cuánta munición trae cada caja en `AMMO`
- Qué hay dentro de cada mueble: tabla `C` en `src/furniture.js` (por ejemplo `armero`, `mesita`, `mostrador`, `cofre_camion`); qué muebles lleva cada habitación: `SETS`
- Botín extra por habitación: tabla `LOOT` en `src/weapons.js` (las armas de fuego largas van al suelo; lo demás, a un mueble de esa habitación)
- Calidades: tabla `PRESETS` en `src/quality.js` (resolución, sombras, niebla, luces, distancia de interiores, hierba, árboles lejanos, detalle de zombis, milisegundos de carga)
- Terreno: `HILL`, `HILL2` y `CERRO` (alturas) y `rawHeight` en `src/world.js`; cuánto frena una cuesta: busca "cuesta arriba" en `src/player.js`
- Cobertura: distancia para pegarse en `updateCover` (0,55 m) y cuánto se ve tras una valla (`0.35` en `src/zombie.js`, busca "cobertura")
- Hierba alta: dónde sale, en `generateChunk` de `src/world.js` (busca `c.tall`); cuánto esconde, `grass` en `src/zombie.js`; aspecto en `src/vegetation.js`
- Corredores: `RUNNER_CHANCE` (proporción) y `RUNNER` (velocidad, vista, chillido) en `src/zombie.js`
- Cuántas casas de dos pisos y tiendas salen: el reparto en `generateChunk` de `src/world.js` (busca `B.SHOPS`)
- Esquiva: `DODGE_DIST` en `src/player.js`; cuánto tarda el zombi en agarrar: `WINDUP` en `src/zombie.js`
- Parón al golpear: `hitStop` en `resolveSwing` de `src/combat.js` (pon 0 para quitarlo); sacudida de cámara: `shake` en `src/camera.js`
- Ritmo de los ataques: `ANIM` en `src/combat.js`; suavidad de las animaciones: números de `blend(...)` en `src/models.js`
- Distancia a la que te oyen correr o caminar: `NOISE_RUN` y `NOISE_WALK` en `src/player.js` (pon `NOISE_WALK = 0` para que caminar de pie sea silencioso)
- Sigilo: `CROUCH_SIGHT`, `PRONE_SIGHT` y `NOTICE_TIME` en `src/zombie.js`
- Cantidad de zombis y probabilidad de horda: `HORDE_CHANCE` y la sección de zombis en `src/world.js`
- Inercia del movimiento: `ACCEL` y `DECEL` en `src/player.js`
- Distancia de la cámara: constantes al inicio de `src/camera.js`
- Niebla: `fog` de cada calidad en `src/quality.js`
- Probabilidad de edificios raros: `specialQ` en `src/world.js`

**Bloque 6.2: protagonista de una pieza, remera blanca y vendas**
- El torso del protagonista ya no se arma con esferas y cilindros encimados (eso dejaba círculos en el pecho). Ahora es una sola superficie hecha con secciones de la cadera al cuello (ancho y fondo por altura, pecho algo más cuadrado, espalda y hombros con su caída), con normales suaves y los pesos repartidos a lo largo de los tres tramos de la columna y las clavículas: se dobla sin cortes
- Brazos, piernas y cuello también son tubos de una pieza que se afinan (hombro, bíceps, codo, antebrazo, muñeca; muslo, rodilla, pantorrilla, tobillo). Fuera las esferas sueltas de codos, rodillas, bíceps y muslos
- Ropa nueva: remera blanca gastada de manga corta, con el dobladillo y las mangas un poco deshilachados, cuello redondo amarillento, mugre en los costados y abajo, sombra en las axilas y una mancha de sangre seca en el costado. Brazos al aire desde la manga
- Vendas: una en el antebrazo izquierdo y otra alrededor del codo derecho, con las vueltas marcadas, algo sucias, una mancha de sangre y la punta remetida. Se doblan con el brazo
- Pantalón con desgaste en muslos y rodillas y barro cerca de las botas. Se mantienen las botas altas con cordones, la pistolera en el muslo (ahora con correa alrededor de la pierna), la funda de la navaja y un bolsillo lateral
- Las correas de la mochila siguen ahora la forma de la remera (del pecho, por encima del hombro, a la mochila), con hebilla en el pecho
- Unos 12 700 triángulos (antes unos 11 900). Manos, pies y cara iguales. Los zombis no cambian
- El código está en `src/models.js` (`heroBody`, `HERO_TT` para la forma del torso y las tablas de brazos y piernas). `G.Mesher.vert` añade vértices con normal y pesos propios

**Bloque 6.3: puñetazos y cámara de pelea**
- Partimos de un video de referencia de peleas cuerpo a cuerpo, desglosado cuadro por cuadro: cuánto dura la carga, el impacto y la recuperación de cada golpe, y qué hace la cámara en cada fase. Lo llevamos a una versión propia (tiempos, poses y números nuestros, sin calcar)
- Puñetazos con las manos libres: Atacar lanza un combo de tres. Gancho de derecha (0,5 s), gancho de izquierda (0,46 s) y golpe fuerte (0,88 s): el personaje se agacha y se aparta, sube girando con todo el cuerpo, descarga y termina inclinado hacia delante por la inercia. Cada golpe aturde; el fuerte derriba a menudo (y después se pisotea). Empujar sigue en su botón. Si delante solo hay un zombi caído, el primer golpe es un pisotón
- Guardia: después de pelear sin arma el personaje levanta los puños unos segundos, con las rodillas algo flexionadas y el pie izquierdo adelante
- Los brazos siguen trayectorias de carga, golpe y vuelta (IK), con el codo guiado: afuera y a la altura del hombro en los ganchos
- Cámara de pelea: desde el primer golpe y hasta 2,4 s después la cámara se acerca (1,7 m) y baja un poco; mientras golpeas se coloca sola a tu espalda (si no la estás moviendo tú)
- Cada golpe tiene su coreografía de cámara. En la carga la cámara se va hacia el lado del brazo que golpea; en el impacto da un latigazo hacia el otro lado siguiendo el puño o el arma, se mete encima y se inclina un poco; después vuelve sola. En el golpe fuerte se abre a tres cuartos mientras te agachas y vuelve a tu espalda justo antes de pegar. Vale también para las armas (horizontal, revés, de arriba abajo, puñalada, empujón, pisotón y ataque en carrera)
- Al acertar: el parón breve que ya había, más un golpe de zoom (el campo de visión se cierra unos grados y vuelve), sacudida y un empujón de la cámara hacia delante
- El remate en el suelo se ve ahora de tres cuartos (antes de costado): el personaje se ve casi siempre de espaldas
- Para ajustar: `CHOREO` en `src/camera.js` (cámara por golpe), `PUNCH` en `src/combat.js` (tiempos y daño de los puños) y `FIST_TR` en `src/models.js` (trayectorias de los puños)

**Bloque 6.4: cámara baja, pelea con reacciones y zombis más peligrosos**
- Cámara a la altura de la cintura (como en los videos de referencia): el personaje se ve de las rodillas para arriba, un poco desde abajo. Al apuntar sube al hombro y se pega (más cerca con armas largas)
- Zoom dinámico, siempre en movimiento: corriendo la cámara se aleja y abre el campo de visión; con zombis persiguiéndote cerca se cierra un poco; quieto, se acerca despacio y "respira"; en la pelea se pega y en cada golpe hace su coreografía
- Golpe automático: al atacar con un zombi cerca, el personaje se gira y le pega al más cercano (en cualquier dirección), dando un paso o lanzándose hacia él si está a un par de metros. Si empujas el joystick hacia uno, le pega a ese: así se va pegando a dos que te rodean. El que va a recibir el golpe se marca con el contorno
- Reacciones de los zombis a los golpes, según el tipo: un gancho o un golpe horizontal les tuerce la cabeza y el torso de lado y los hace trastabillar de costado; el golpe fuerte los echa atrás con los brazos arriba; de arriba abajo se les doblan las rodillas; una puñalada los encorva; un disparo los echa atrás. Ahora retroceden de verdad (de medio metro a casi un metro) y, si chocan contra una pared, se estampan y quedan aturdidos más tiempo. Al morir salen despedidos
- Daño de las armas cuerpo a cuerpo: un golpe que acierta quita al menos 1,17, así que ningún zombi aguanta más de 3 golpes (las pesadas, 1 o 2). Los puños siguen igual
- Ataque de los zombis como en los videos: se encogen con las garras arriba, se lanzan con el cuerpo por delante y los brazos estirados, y el brazo derecho barre cruzando; si te alcanzan, el izquierdo se te queda agarrado un momento; si fallan, el impulso los lleva un paso de más
- Tu personaje acusa los golpes: se echa atrás o de lado según de dónde venga el golpe, retrocede un paso y se cubre con los brazos; un mordisco es un forcejeo. Corta el golpe que estabas dando. La cámara no se mueve por los golpes que recibes
- Zombis más rápidos y agresivos: persiguen a 1,3 m/s (antes 0,95), ven más lejos, te notan antes, preparan el ataque en 0,6 s (antes 0,9) y llegan más lejos; hay más corredores (32 %) y corren más (3,55 m/s). Aparecen un poco más (alrededor de un 10 % más)
- Comisarías: ahora salen unas 4 veces más (los edificios especiales son el doble de frecuentes y la mitad son comisarías)
- Armas largas: sin apuntar se llevan en la mano derecha a la altura de la cadera, con el cañón hacia delante y abajo y la izquierda libre; al apuntar, culata al hombro con las dos manos. Más retroceso en escopeta y rifle
- Recargar deja de apuntar (vuelves a apuntar tocando Apuntar otra vez o, en PC, al terminar si sigues con el botón)
- Correr agachado: con Correr estando agachado, el personaje corre encorvado (3 m/s, más rápido que caminar y con mucho menos ruido que corriendo de pie)
- Fuera el botón de empujar. Sin arma, Atacar a un zombi caído es un pisotón. En PC, Espacio salta; en el mando, X recarga
- La cruz de armas se abre siempre en el mismo sitio (a la derecha, algo por encima del centro), esté donde esté el indicador
- Mochila nueva: cuerpo de lona redondeado con tapa que cae por encima, bolsillo delantero y laterales, correas con hebillas y saco de dormir enrollado abajo

**Bloque 6.5: cambio de rumbo (modo tipo "sin retorno"), mundo de pruebas y modo desarrollador**
- Cambio de planes: en vez de un survival de mundo abierto, el juego va hacia un modo de encuentros cerrados tipo "sin retorno". Empezamos con betas de prueba de mecánicas
- Mundo de pruebas: pequeño (3 x 3 chunks, 96 x 96 m), plano y cerrado con una valla que no se puede saltar. En el centro, el pueblo con la casa de inicio; alrededor, campo con caminos y alguna cabaña; fuera de la valla, bosque. El mundo infinito sigue en el código: `SMALL = false` en `src/world.js`
- Sin botín por ahora: ni armas en el suelo ni cosas en los muebles (palos, munición, vendas...). El código queda guardado para después: `LOOT = true` en `src/world.js`
- Sin zombis que aparezcan solos (se sacan con el botón de pruebas). Para volver a activarlos: `AUTO_ZOMBIES = true` en `src/world.js`
- La mochila se lleva siempre, con o sin el modo desarrollador
- Opción "Pruebas de desarrollador" (en el inicio y en la pausa; se guarda en el navegador): al activarla tienes bate, pistola, escopeta, rifle y arco (este en la mochila), munición sin fin y vendas; en la mochila aparece la Armería con todas las armas del juego (tócalas para ponerlas en su espacio y equiparlas)
- Con el modo desarrollador aparece arriba el botón "+ Zombi" (en PC también la tecla N): saca un zombi a unos metros delante de ti, que viene a por ti (a veces un corredor). Se puede mover con el editor de botones
- Cámara enganchada al hombro, como en las fotos de referencia: a la altura de la cabeza, cerca y mirando un poco hacia abajo; el personaje se ve de medio muslo para arriba, a la izquierda del encuadre. Al apuntar se pega más

## Plan de bloques

1. Base y zombis lentos (hecho)
2. Mundo infinito por chunks (hecho; guardado, ahora se usa el mundo de pruebas)
3. Tercera persona, casas con interiores y combate (hecho)
4. Casas de dos pisos, muebles y tiendas (hecho)
5. Menú de botín, rendimiento y vegetación (hecho)
6. Inventario, mochila, curación, HUD, cámara, pelea y modo desarrollador (hecho)
7. Betas de prueba de mecánicas en el mundo de pruebas (en curso)
8. Modo tipo "sin retorno": oleadas de zombis en zonas cerradas, recompensas entre encuentros
9. Banco de taller para arreglar armas de fuego
10. Pulido: sonido, guardado, PWA

## Pulido final (pendiente)

Detalles que se dejan para el final, cuando el resto del juego esté hecho:
- Hierba alta: mejorar la textura de las hojas (forma, color, variedad) y revisar la densidad en general (cuánta hay por zona y cuántas matas por casilla). Se ajusta en `src/vegetation.js` (`grassCanvas`, `grassGeo` y las matas por casilla en `build`), en `grass` y `grassFar` de `src/quality.js` y en `c.tall` de `src/world.js`

## Licencia

Añade una licencia al repositorio (por ejemplo MIT) antes de publicarlo. Three.js se carga desde un CDN y tiene su propia licencia (MIT).
