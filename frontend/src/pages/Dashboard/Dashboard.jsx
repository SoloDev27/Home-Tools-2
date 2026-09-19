import { useState, useMemo, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { thunkGetAllMaps, thunkDeleteMap } from "../../redux/maps";
import MapCard from "../../components/MapCard";
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { OverflowList } from "@astryxdesign/core/OverflowList";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Divider } from "@astryxdesign/core/Divider";
import { Center } from "@astryxdesign/core/Center";
import { VStack, HStack, StackItem } from "@astryxdesign/core/Stack";
import { Button } from "@astryxdesign/core/Button";
import { Search, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

const CATEGORIES = ['All', 'Maps'];

export default function Dashboard() {
    const mapsState = useSelector(store => store.maps);
    const maps = mapsState?.data || [];
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const scrollContainerRef = useRef(null);

    const [activeTab, setActiveTab] = useState('All');
    const [search, setSearch] = useState('');

    useEffect(() => {
        dispatch(thunkGetAllMaps());
    }, [dispatch]);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this map? All associated data will be lost.")) {
            await dispatch(thunkDeleteMap(id));
        }
    };

    const filtered = useMemo(() => {
        let items = maps;
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(
                i =>
                    i.name.toLowerCase().includes(q) ||
                    (i.description && i.description.toLowerCase().includes(q))
            );
        }
        return items;
    }, [maps, search]);

    const displayMaps = useMemo(() => filtered.slice(0, 6), [filtered]);

    return (
        <Layout
            height="auto"
            header={
                <LayoutHeader hasDivider padding={6}>
                    <VStack gap={1}>
                        <Heading level={1}>All</Heading>
                        <Text type="supporting" color="secondary">
                            All tools and workspaces
                        </Text>
                    </VStack>
                </LayoutHeader>
            }
            content={
                <LayoutContent padding={6}>
                    <VStack gap={6} width="100%">
                        <VStack gap={4} width="100%">
                            <TextInput
                                label="Search"
                                isLabelHidden
                                placeholder="Search..."
                                value={search}
                                onChange={setSearch}
                                startIcon={<Search size={18} />}
                                size="lg"
                            />
                            <HStack vAlign="center" gap={4} width="100%">
                                <StackItem size="fill">
                                    <VStack>
                                        <ToggleButtonGroup
                                            label="Filter by category"
                                            value={activeTab}
                                            onChange={v => {
                                                if (v === 'Maps') {
                                                    navigate('/maps');
                                                } else {
                                                    setActiveTab(v ?? 'All');
                                                }
                                            }}
                                        >
                                            <OverflowList
                                                gap={1}
                                                behavior="observeParent"
                                                overflowRenderer={overflowItems => (
                                                    <DropdownMenu
                                                        button={{
                                                            label: `+${overflowItems.length}`,
                                                            variant: 'ghost',
                                                            size: 'lg',
                                                        }}
                                                        items={overflowItems.map(({ index }) => ({
                                                            label: CATEGORIES[index],
                                                            onClick: () => {
                                                                if (CATEGORIES[index] === 'Maps') {
                                                                    navigate('/maps');
                                                                } else {
                                                                    setActiveTab(CATEGORIES[index]);
                                                                }
                                                            },
                                                        }))}
                                                    />
                                                )}
                                            >
                                                {CATEGORIES.map(cat => (
                                                    <ToggleButton
                                                        key={cat}
                                                        label={cat}
                                                        value={cat}
                                                        size="lg"
                                                    />
                                                ))}
                                            </OverflowList>
                                        </ToggleButtonGroup>
                                    </VStack>
                                </StackItem>
                            </HStack>
                        </VStack>

                        <Divider />

                        {filtered.length === 0 ? (
                            <Center style={{ padding: '48px 0' }}>
                                <Text type="supporting" color="secondary">
                                    {maps.length === 0 ? "No maps yet." : "No results found."}
                                </Text>
                            </Center>
                        ) : (
                            <VStack gap={4} width="100%">
                                <HStack justify="between" align="center" width="100%">
                                    <Heading level={2}>Maps</Heading>
                                    <HStack gap={1} align="center">
                                        <Button 
                                            isIconOnly 
                                            variant="ghost" 
                                            size="sm" 
                                            icon={<ChevronLeft size={18} />} 
                                            aria-label="Slide left"
                                            onClick={() => scrollContainerRef.current?.scrollBy({ left: -340, behavior: 'smooth' })} 
                                        />
                                        <Button 
                                            isIconOnly 
                                            variant="ghost" 
                                            size="sm" 
                                            icon={<ChevronRight size={18} />} 
                                            aria-label="Slide right"
                                            onClick={() => scrollContainerRef.current?.scrollBy({ left: 340, behavior: 'smooth' })} 
                                        />
                                    </HStack>
                                </HStack>

                                <div 
                                    ref={scrollContainerRef}
                                    style={{ 
                                        display: 'flex', 
                                        flexDirection: 'row', 
                                        gap: 16, 
                                        overflowX: 'auto', 
                                        scrollSnapType: 'x mandatory',
                                        scrollBehavior: 'smooth',
                                        paddingBottom: 16,
                                        paddingTop: 4,
                                        alignItems: 'stretch',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    {displayMaps.map(map => (
                                        <div 
                                            key={map.id} 
                                            style={{ 
                                                flex: '0 0 320px', 
                                                width: 320, 
                                                minWidth: 320, 
                                                scrollSnapAlign: 'start', 
                                                display: 'flex', 
                                                flexDirection: 'column' 
                                            }}
                                        >
                                            <MapCard 
                                                map={map} 
                                                onDelete={handleDelete} 
                                                onSelect={() => navigate(`/editor/${map.id}`)} 
                                            />
                                        </div>
                                    ))}

                                    {/* Extra View All div */}
                                    <div 
                                        onClick={() => navigate('/maps')}
                                        style={{ 
                                            flex: '0 0 320px', 
                                            width: 320, 
                                            minWidth: 320, 
                                            scrollSnapAlign: 'start',
                                            cursor: 'pointer', 
                                            display: 'flex', 
                                            flexDirection: 'column' 
                                        }}
                                    >
                                        <Card 
                                            padding={6} 
                                            elevation="low" 
                                            style={{ 
                                                height: '100%', 
                                                minHeight: 280,
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                border: '2px dashed var(--color-border)',
                                                backgroundColor: 'var(--color-background-surface)',
                                                boxSizing: 'border-box',
                                                textAlign: 'center',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <VStack gap={3} align="center" justify="center">
                                                <div style={{ 
                                                    width: 52, 
                                                    height: 52, 
                                                    borderRadius: '50%', 
                                                    backgroundColor: 'var(--color-background-muted)', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    border: '1px solid var(--color-border)'
                                                }}>
                                                    <ArrowRight size={24} />
                                                </div>
                                                <Heading level={3} weight="semibold">View All</Heading>
                                                <Text type="supporting" size="sm" color="secondary">
                                                    See all maps ({maps.length})
                                                </Text>
                                                <Button 
                                                    label="View All Maps" 
                                                    variant="secondary" 
                                                    size="sm"
                                                    icon={<ArrowRight size={14} />} 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate('/maps');
                                                    }}
                                                />
                                            </VStack>
                                        </Card>
                                    </div>
                                </div>
                            </VStack>
                        )}
                    </VStack>
                </LayoutContent>
            }
        />
    );
}
