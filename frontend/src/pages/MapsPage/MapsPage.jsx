import { useState, useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { thunkGetAllMaps, thunkDeleteMap } from "../../redux/maps";
import { ModalButton } from "../../context/Modal";
import MapForm from "../../components/Forms/MapForm";
import MapCard from "../../components/MapCard";
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { OverflowList } from "@astryxdesign/core/OverflowList";
import { Divider } from "@astryxdesign/core/Divider";
import { Center } from "@astryxdesign/core/Center";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack, HStack, StackItem } from "@astryxdesign/core/Stack";
import { Button } from "@astryxdesign/core/Button";
import { Plus, Search } from "lucide-react";

const CATEGORIES = ['All', 'Maps'];

export default function MapsPage() {
    const mapsState = useSelector(store => store.maps);
    const maps = mapsState?.data || [];
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [activeTab, setActiveTab] = useState('Maps');
    const [search, setSearch] = useState('');
    const [sortOrder, setSortOrder] = useState('A-Z');

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
        const sorted = [...items];
        if (sortOrder === "A-Z") {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortOrder === "Z-A") {
            sorted.sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortOrder === "Newest") {
            sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        }
        return sorted;
    }, [maps, search, sortOrder]);

    return (
        <Layout
            height="auto"
            header={
                <LayoutHeader hasDivider padding={6}>
                    <HStack justify="between" align="center" width="100%">
                        <VStack gap={1}>
                            <Heading level={1}>Maps</Heading>
                            <Text type="supporting" color="secondary">
                                Manage your workspaces and floorplans
                            </Text>
                        </VStack>
                        <ModalButton
                            modalComponent={<MapForm />}
                            itemText={
                                <Button 
                                    label="New Map" 
                                    variant="primary" 
                                    icon={<Plus size={16} />} 
                                />
                            }
                        />
                    </HStack>
                </LayoutHeader>
            }
            content={
                <LayoutContent padding={6}>
                    <VStack gap={6} width="100%">
                        <VStack gap={4} width="100%">
                            <TextInput
                                label="Search"
                                isLabelHidden
                                placeholder="Search maps..."
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
                                                if (v === 'All') {
                                                    navigate('/dashboard');
                                                } else {
                                                    setActiveTab(v ?? 'Maps');
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
                                                                if (CATEGORIES[index] === 'All') {
                                                                    navigate('/dashboard');
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
                                <DropdownMenu
                                    button={{ label: `Sort: ${sortOrder}`, size: 'lg' }}
                                    items={[
                                        { label: 'A-Z', onClick: () => setSortOrder('A-Z') },
                                        { label: 'Z-A', onClick: () => setSortOrder('Z-A') },
                                        { label: 'Newest', onClick: () => setSortOrder('Newest') },
                                    ]}
                                />
                            </HStack>
                        </VStack>

                        <Divider />

                        {filtered.length === 0 ? (
                            <Center style={{ padding: '48px 0' }}>
                                <Text type="supporting" color="secondary">
                                    {maps.length === 0 ? "No maps yet. Create your first map above!" : "No results found."}
                                </Text>
                            </Center>
                        ) : (
                            <Grid columns={{ minWidth: 300, max: 3 }} gap={4} width="100%">
                                {filtered.map(map => (
                                    <MapCard
                                        key={map.id}
                                        map={map}
                                        onDelete={handleDelete}
                                        onSelect={() => navigate(`/editor/${map.id}`)}
                                    />
                                ))}
                            </Grid>
                        )}
                    </VStack>
                </LayoutContent>
            }
        />
    );
}
