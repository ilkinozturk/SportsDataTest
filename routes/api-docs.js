/**
 * @swagger
 * /api/teams/data:
 *   get:
 *     summary: Takım istatistikleri ve verileri
 *     tags: [Teams]
 *     description: Performans metrikleri, son maçlar ve lig pozisyonu dahil kapsamlı takım istatistiklerini getirir
 *     parameters:
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Takımın benzersiz kimliği
 *         example: 836
 *     responses:
 *       200:
 *         description: Takım verileri başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TeamData'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/teams/{teamId}/matches:
 *   get:
 *     summary: Takım maçları
 *     tags: [Teams]
 *     description: Belirli bir takımın maçlarını opsiyonel filtrelerle getirir
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Takımın benzersiz kimliği
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Maçlar için başlangıç tarihi (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Maçlar için bitiş tarihi (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 15
 *         description: Döndürülecek maksimum maç sayısı
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [complete, scheduled, in_play]
 *           default: complete
 *         description: Maçları durumuna göre filtrele
 *     responses:
 *       200:
 *         description: Maçlar başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 teamId:
 *                   type: integer
 *                 count:
 *                   type: integer
 *                 matches:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Match'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/teams/compare:
 *   get:
 *     summary: İki takımı karşılaştır
 *     tags: [Teams]
 *     description: İki takım arasında istatistik ve performans metriklerini karşılaştırır
 *     parameters:
 *       - in: query
 *         name: team1
 *         required: true
 *         schema:
 *           type: integer
 *         description: İlk takım ID
 *       - in: query
 *         name: team2
 *         required: true
 *         schema:
 *           type: integer
 *         description: İkinci takım ID
 *     responses:
 *       200:
 *         description: Karşılaştırma verileri başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     team1:
 *                       $ref: '#/components/schemas/TeamData'
 *                     team2:
 *                       $ref: '#/components/schemas/TeamData'
 *                     comparison:
 *                       type: object
 *                       description: Kafa kafaya karşılaştırma metrikleri
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/teams/batch:
 *   post:
 *     summary: Birden fazla takım verisi al
 *     tags: [Teams]
 *     description: Tek bir istekte birden fazla takımın istatistiklerini getirir
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teamIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [836, 837, 838]
 *     responses:
 *       200:
 *         description: Birden fazla takım verisi başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TeamData'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/teams/{teamId}/cache:
 *   delete:
 *     summary: Takım önbelleğini temizle
 *     tags: [Teams]
 *     description: Belirli bir takım için önbelleğe alınmış verileri temizler
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Takımın benzersiz kimliği
 *     responses:
 *       200:
 *         description: Önbellek başarıyla temizlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/matches/today:
 *   get:
 *     summary: Bugünün maçları
 *     tags: [Matches]
 *     description: Bugün oynanacak tüm maçları getirir
 *     parameters:
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *           default: UTC
 *         description: Tarih hesaplaması için zaman dilimi
 *         example: Europe/Istanbul
 *     responses:
 *       200:
 *         description: Bugünün maçları başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 date:
 *                   type: string
 *                   format: date
 *                 matches:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Match'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/matches/date/{date}:
 *   get:
 *     summary: Belirli tarihteki maçlar
 *     tags: [Matches]
 *     description: Belirli bir tarihte oynanacak tüm maçları getirir
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: YYYY-MM-DD formatında tarih
 *         example: "2025-07-01"
 *     responses:
 *       200:
 *         description: Maçlar başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 date:
 *                   type: string
 *                 matches:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Match'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/matches/range:
 *   get:
 *     summary: Tarih aralığındaki maçlar
 *     tags: [Matches]
 *     description: Belirtilen tarih aralığındaki maçları getirir
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Maçlar başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 dateRange:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                     to:
 *                       type: string
 *                 matches:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Match'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/matches/h2h/{team1}/{team2}:
 *   get:
 *     summary: Kafa kafaya maçlar
 *     tags: [Matches]
 *     description: İki takım arasındaki geçmiş maçları getirir
 *     parameters:
 *       - in: path
 *         name: team1
 *         required: true
 *         schema:
 *           type: integer
 *         description: İlk takım ID
 *       - in: path
 *         name: team2
 *         required: true
 *         schema:
 *           type: integer
 *         description: İkinci takım ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Döndürülecek maksimum maç sayısı
 *     responses:
 *       200:
 *         description: Kafa kafaya maçlar başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 team1:
 *                   type: integer
 *                 team2:
 *                   type: integer
 *                 count:
 *                   type: integer
 *                 matches:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Match'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/matches/live:
 *   get:
 *     summary: Canlı maçlar
 *     tags: [Matches]
 *     description: Şu anda oynanmakta olan tüm maçları getirir
 *     responses:
 *       200:
 *         description: Canlı maçlar başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 matches:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Match'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/leagues/{leagueId}/standings:
 *   get:
 *     summary: Lig puan durumu
 *     tags: [Leagues]
 *     description: Belirli bir ligin güncel puan durumunu getirir
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ligin benzersiz kimliği
 *     responses:
 *       200:
 *         description: Puan durumu başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 leagueId:
 *                   type: integer
 *                 seasonId:
 *                   type: integer
 *                 standings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeagueTeam'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/leagues/{leagueId}/matches:
 *   get:
 *     summary: Lig maçları
 *     tags: [Leagues]
 *     description: Belirli bir ligin maçlarını getirir
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ligin benzersiz kimliği
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Belirli bir tarihe göre filtrele
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Aralık için başlangıç tarihi
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Aralık için bitiş tarihi
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [complete, scheduled, in_play]
 *         description: Maç durumuna göre filtrele
 *     responses:
 *       200:
 *         description: Lig maçları başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 leagueId:
 *                   type: integer
 *                 count:
 *                   type: integer
 *                 matches:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Match'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Kapsamlı sağlık kontrolü
 *     tags: [Health]
 *     description: Bellek, CPU ve bağımlılıklar dahil detaylı sağlık durumunu getirir
 *     responses:
 *       200:
 *         description: Servis sağlıklı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [UP, DOWN]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: object
 *                   properties:
 *                     process:
 *                       type: number
 *                     system:
 *                       type: number
 *                     formatted:
 *                       type: string
 *                 memory:
 *                   type: object
 *                 cpu:
 *                   type: object
 *                 environment:
 *                   type: object
 *                 dependencies:
 *                   type: object
 *                 responseTime:
 *                   type: string
 *                 version:
 *                   type: string
 *       503:
 *         description: Servis sağlıksız
 */

/**
 * @swagger
 * /health/ping:
 *   get:
 *     summary: Basit ping sağlık kontrolü
 *     tags: [Health]
 *     description: Yük dengeleyiciler için hızlı sağlık kontrolü
 *     responses:
 *       200:
 *         description: Servis çalışıyor
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: pong
 */

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Hazırlık durumu
 *     tags: [Health]
 *     description: Servisin trafik kabul etmeye hazır olup olmadığını kontrol eder
 *     responses:
 *       200:
 *         description: Servis hazır
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Servis hazır değil
 */

/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: Detaylı metrikler
 *     tags: [Health]
 *     description: Detaylı performans ve kullanım metriklerini getirir
 *     responses:
 *       200:
 *         description: Metrikler başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 cache:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                     hitRate:
 *                       type: string
 *                     size:
 *                       type: integer
 *                 api:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: integer
 *                     successfulRequests:
 *                       type: integer
 *                     failedRequests:
 *                       type: integer
 *                     averageResponseTime:
 *                       type: number
 *                     requestsPerMinute:
 *                       type: number
 *                 memory:
 *                   type: object
 *                 performance:
 *                   type: object
 */

/**
 * @swagger
 * /api/cache/stats:
 *   get:
 *     summary: Önbellek istatistikleri
 *     tags: [Health]
 *     description: Önbellek performans istatistiklerini getirir
 *     responses:
 *       200:
 *         description: Önbellek istatistikleri başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: object
 *                     repository:
 *                       type: object
 */

// Bu dosya Swagger konfigürasyonu tarafından JSDoc yorumlarını ayrıştırmak için kullanılır