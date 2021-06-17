<?php

$app->get('/', function ($request, $response, $args) {
    return $this->renderer->render($response, 'about.phtml', $args);
});

$app->get('/calculator', function ($request, $response, $args) {
    return $this->renderer->render($response, 'calculator.phtml', $args);
});

$app->get('/jita-buy', function ($request, $response, $args) {
    $db = TT\Database::getDb();

    $sql = 'SELECT i.typeName AS typename, i.groupId AS groupid, j.best AS value FROM vjitabestbuy j JOIN invtype i ON i.typeId=j.typeId';
    $stmt = $db->prepare($sql);
    $stmt->execute();

    $response = $this->cache->withExpires($response, time() + 3600);
    return $response->withJson($stmt->fetchAll(PDO::FETCH_ASSOC));
});
